import Foundation
import Testing

@testable import CruceCore

/// La cola sin conexión de `LedgerStore` (CP12): el orden de envío, un corte de red a mitad del envío, lo que la base
/// rechaza, editar o eliminar sin red y abrir la app de nuevo con la cola guardada. Completa `LedgerOfflineTests`.
@MainActor
@Suite("Cola sin conexión")
struct LedgerQueueTests {
    private let joan = MockData.joan
    private let jesus = MockData.jesus
    private let jesusCruce = MockData.joanJesusCruceID
    private let anaCruce = MockData.joanAnaCruceID

    /// Joan con su cruce con Jesús abierto; con `withAna`, también con Ana (Jesús sigue abierto).
    private func session(withAna: Bool = false) -> SessionStore {
        let cruces =
            withAna
            ? [MockData.joanAnaCruce, MockData.joanJesusCruce(viewer: joan)]
            : [MockData.joanJesusCruce(viewer: joan)]
        let session = SessionStore(phase: .main, me: joan, partner: jesus, cruces: cruces, userID: joan.id)
        session.open(jesusCruce)
        return session
    }

    private func expense(_ amount: Int, day: Int = 1, concept: String = "Prueba") -> Movement {
        Movement(
            payerID: joan.id, amount: amount, concept: concept, category: .otro,
            date: Date(timeIntervalSince1970: TimeInterval(day) * 86_400), createdBy: joan.id)
    }

    private func store(
        _ repository: ScriptedLedgerRepository, local: InMemoryLedgerLocalStore = InMemoryLedgerLocalStore(),
        session: SessionStore? = nil
    ) -> LedgerStore {
        LedgerStore(session: session ?? self.session(), repository: repository, localStore: local)
    }

    @Test("Lo pendiente llega a la base en el orden en que se anotó")
    func sendsInOrder() async throws {
        let repository = ScriptedLedgerRepository()
        let local = InMemoryLedgerLocalStore()
        let ledger = store(repository, local: local)
        let dinner = expense(60_000, day: 1)
        let market = expense(100_000, day: 2)
        let taxi = expense(20_000, day: 3)
        await ledger.save(dinner)
        await ledger.save(market)
        await ledger.delete(dinner.id)
        await ledger.save(taxi)
        #expect(ledger.pendingSyncCount == 4)
        #expect(await repository.calls.isEmpty)

        await repository.goOnline()
        await ledger.retrySync()
        #expect(
            await repository.calls == [
                .save(dinner.id, cruce: jesusCruce), .save(market.id, cruce: jesusCruce),
                .delete(dinner.id, cruce: jesusCruce), .save(taxi.id, cruce: jesusCruce),
            ])
        #expect(ledger.pendingSyncCount == 0)
        #expect(!ledger.isOffline)
        #expect(ledger.visibleMovements.map(\.id) == [taxi.id, market.id])
        #expect(try await local.load().pending.isEmpty)
    }

    @Test("Si la red se cae a mitad del envío, lo enviado sale de la cola y el resto queda en orden")
    func networkDropsMidQueue() async throws {
        let repository = ScriptedLedgerRepository()
        let local = InMemoryLedgerLocalStore()
        let ledger = store(repository, local: local)
        let dinner = expense(60_000, day: 1)
        let market = expense(100_000, day: 2)
        let taxi = expense(20_000, day: 3)
        for movement in [dinner, market, taxi] { await ledger.save(movement) }

        await repository.goOnline(acceptingWrites: 1)
        await ledger.retrySync()
        let left: [LedgerPendingOperation] = [.save(market, cruce: jesusCruce), .save(taxi, cruce: jesusCruce)]
        #expect(await repository.calls == [.save(dinner.id, cruce: jesusCruce)])
        #expect(ledger.pending == left)
        #expect(ledger.pendingSyncCount == 2)
        #expect(ledger.isOffline)
        #expect(Set(ledger.visibleMovements.map(\.id)) == [dinner.id, market.id, taxi.id])
        #expect(try await local.load().pending == left)

        await repository.goOnline()
        await ledger.retrySync()
        #expect(
            await repository.calls == [
                .save(dinner.id, cruce: jesusCruce), .save(market.id, cruce: jesusCruce),
                .save(taxi.id, cruce: jesusCruce),
            ])
        #expect(ledger.pendingSyncCount == 0)
        #expect(!ledger.isOffline)
    }

    @Test("La base rechaza uno de la cola: sale, los demás llegan y al recargar ya no se ve")
    func rejectedItemDoesNotBlockTheRest() async throws {
        let repository = ScriptedLedgerRepository()
        let local = InMemoryLedgerLocalStore()
        let ledger = store(repository, local: local)
        let dinner = expense(60_000, day: 1)
        let invalid = expense(5_000, day: 2, concept: "Inválido")
        let taxi = expense(20_000, day: 3)
        for movement in [dinner, invalid, taxi] { await ledger.save(movement) }
        #expect(ledger.movement(invalid.id) != nil)

        await repository.reject(movement: invalid.id)
        await repository.goOnline()
        await ledger.retrySync()
        #expect(await repository.calls == [.save(dinner.id, cruce: jesusCruce), .save(taxi.id, cruce: jesusCruce)])
        #expect(ledger.pendingSyncCount == 0)
        #expect(!ledger.isOffline)
        #expect(ledger.visibleMovements.map(\.id) == [taxi.id, dinner.id])
        #expect(ledger.net == 40_000)
        let saved = try await local.load()
        #expect(saved.pending.isEmpty)
        #expect(saved.movementsByCruce[jesusCruce]?.contains { $0.id == invalid.id } == false)
    }

    @Test("Si la otra persona cerró el cruce, lo pendiente ahí sale de la cola y lo de otro cruce sí llega")
    func closedCruceRejection() async throws {
        let repository = ScriptedLedgerRepository()
        let session = session(withAna: true)
        let ledger = store(repository, session: session)
        let dinner = expense(60_000, day: 1)
        await ledger.save(dinner)
        session.open(anaCruce)
        let lunch = expense(30_000, day: 2)
        await ledger.save(lunch)
        #expect(ledger.pendingSyncCount == 2)

        // Jesús desvinculó mientras Joan estaba sin red: la base rechaza lo de ese cruce (`hint = 'cruceClosed'`).
        await repository.close(cruce: jesusCruce)
        await repository.goOnline()
        await ledger.retrySync()
        #expect(await repository.calls == [.save(lunch.id, cruce: anaCruce)])
        #expect(ledger.pendingSyncCount == 0)
        #expect(!ledger.isOffline)
        #expect(ledger.movement(lunch.id) != nil)
        session.open(jesusCruce)
        #expect(ledger.movement(dinner.id) == nil)
        #expect(ledger.net == 0)
    }

    @Test("Editar sin red un gasto que todavía no se envió: se ve la edición y a la base llega la última versión")
    func editPendingMovement() async throws {
        let repository = ScriptedLedgerRepository()
        let ledger = store(repository)
        let dinner = expense(60_000)
        await ledger.save(dinner)
        var edited = dinner
        edited.amount = 80_000
        edited.concept = "Cena con postre"
        ledger.lastSaved = nil
        await ledger.save(edited)
        // Editar no vuelve a abrir "Gasto guardado".
        #expect(ledger.lastSaved == nil)
        #expect(ledger.visibleMovements == [edited])
        #expect(ledger.net == 40_000)
        #expect(ledger.pendingSyncCount == 2)

        await repository.goOnline()
        await ledger.retrySync()
        #expect(try await repository.loadMovements(in: jesusCruce) == [edited])
        #expect(ledger.visibleMovements == [edited])
        #expect(ledger.pendingSyncCount == 0)
    }

    @Test("Eliminar sin red un gasto que ya estaba en la base: sale del saldo, no vuelve al recargar y llega")
    func deleteSyncedMovementOffline() async throws {
        let market = expense(100_000, day: 2)
        let repository = ScriptedLedgerRepository(movements: [jesusCruce: [market]])
        await repository.goOnline()
        let ledger = store(repository)
        await ledger.load()
        #expect(ledger.net == 50_000)

        await repository.goOffline()
        await ledger.delete(market.id)
        #expect(ledger.isEmpty)
        #expect(ledger.net == 0)
        #expect(ledger.movements.first { $0.id == market.id }?.isDeleted == true)
        await ledger.load()
        #expect(ledger.isEmpty)
        #expect(ledger.pendingSyncCount == 1)

        await repository.goOnline()
        await ledger.retrySync()
        #expect(await repository.calls == [.delete(market.id, cruce: jesusCruce)])
        #expect(try await repository.loadMovements(in: jesusCruce).first?.isDeleted == true)
        #expect(ledger.isEmpty)
        #expect(ledger.pendingSyncCount == 0)
    }

    @Test("Al abrir la app de nuevo sin red sigue sin conexión, y al volver la red la cola guardada llega una sola vez")
    func restoredQueueSendsOnce() async throws {
        let local = InMemoryLedgerLocalStore()
        let dinner = expense(60_000)
        await store(ScriptedLedgerRepository(), local: local).save(dinner)

        let repository = ScriptedLedgerRepository()
        let reopened = store(repository, local: local)
        await reopened.restore()
        #expect(reopened.isOffline)
        #expect(reopened.pending == [.save(dinner, cruce: jesusCruce)])
        #expect(reopened.visibleMovements == [dinner])

        await repository.goOnline()
        await reopened.networkChanged(isAvailable: true)
        #expect(await repository.calls == [.save(dinner.id, cruce: jesusCruce)])
        #expect(!reopened.isOffline)
        #expect(reopened.pendingSyncCount == 0)
        #expect(reopened.visibleMovements == [dinner])
        #expect(try await local.load().pending.isEmpty)

        // Restaurar otra vez (por ejemplo, al volver a la app) no reenvía nada.
        await reopened.restore()
        await reopened.retrySync()
        #expect(await repository.calls.count == 1)
    }
}

/// Repositorio falso con guion: sin red hasta `goOnline()`, puede cortar la red después de algunas escrituras, rechazar
/// un movimiento o un cruce cerrado (`LedgerRepositoryError.rejected`, como la base) y anota cada escritura que llega.
actor ScriptedLedgerRepository: LedgerRepository {
    /// Una escritura que llegó a la base.
    enum Call: Equatable, Sendable {
        case save(UUID, cruce: UUID)
        case delete(UUID, cruce: UUID)
    }

    struct Offline: Error {}

    private(set) var calls: [Call] = []
    private var storage: [UUID: [Movement]]
    private var online = false
    /// Cuántas escrituras más se aceptan antes de que se caiga la red; `nil` es sin límite.
    private var writesLeft: Int?
    private var rejectedMovements: Set<UUID> = []
    private var closedCruces: Set<UUID> = []

    init(movements: [UUID: [Movement]] = [:]) {
        storage = movements
    }

    /// Vuelve la red; con `acceptingWrites`, se cae otra vez después de ese número de escrituras.
    func goOnline(acceptingWrites: Int? = nil) {
        online = true
        writesLeft = acceptingWrites
    }

    func goOffline() {
        online = false
    }

    func reject(movement id: UUID) {
        rejectedMovements.insert(id)
    }

    func close(cruce: UUID) {
        closedCruces.insert(cruce)
    }

    func loadMovements(in cruce: UUID) async throws -> [Movement] {
        guard online else { throw Offline() }
        return storage[cruce, default: []]
    }

    func save(_ movement: Movement, in cruce: UUID) async throws {
        try write(movement.id, in: cruce)
        var list = storage[cruce, default: []]
        if let index = list.firstIndex(where: { $0.id == movement.id }) {
            list[index] = movement
        } else {
            list.append(movement)
        }
        storage[cruce] = list
        calls.append(.save(movement.id, cruce: cruce))
    }

    func delete(id: UUID, in cruce: UUID) async throws {
        try write(id, in: cruce)
        if let index = storage[cruce]?.firstIndex(where: { $0.id == id }) {
            storage[cruce]?[index].deletedAt = Date(timeIntervalSince1970: 3_000_000)
        }
        calls.append(.delete(id, cruce: cruce))
    }

    /// Revisa la red, el corte programado y los rechazos antes de una escritura.
    private func write(_ id: UUID, in cruce: UUID) throws {
        guard online else { throw Offline() }
        if let left = writesLeft {
            if left == 0 {
                online = false
                throw Offline()
            }
            writesLeft = left - 1
        }
        if rejectedMovements.contains(id) || closedCruces.contains(cruce) { throw LedgerRepositoryError.rejected }
    }
}
