import Foundation
import Testing

@testable import CruceCore

/// Cómo te pagan en la sesión (Tu perfil), en Saldar, en "Para saldar" y en los tickets, con la base en memoria y los
/// parches de ejemplo.
@MainActor
@Suite("Cómo te pagan en la app")
struct PaymentMethodStoreTests {
    private let joanID = UUID(uuidString: "11111111-1111-1111-1111-111111111111")!
    private let jesusID = UUID(uuidString: "22222222-2222-2222-2222-222222222222")!
    private let nequi = PaymentMethod(kind: .nequi, handle: "3001234567")

    private func makeDirectory() -> InMemoryAccountDirectory {
        InMemoryAccountDirectory(profiles: [
            Profile(id: joanID, displayName: "Joan"),
            Profile(id: jesusID, displayName: "Jesús"),
        ])
    }

    private func session(_ user: UUID, _ directory: InMemoryAccountDirectory) async -> SessionStore {
        let session = SessionStore(
            phase: .onboarding, me: Member(name: "Tú", avatarColor: .yellow, tikeVariant: .rosa),
            partner: Member(name: "Tu amigo", avatarColor: .violet, tikeVariant: .verde),
            auth: InMemoryAuthService(signedIn: user), directory: directory, isReady: false)
        await session.refresh()
        return session
    }

    // MARK: - Tu perfil (S4) y quién lo ve (S2, S3)

    @Test("Jesús guarda su Nequi en Tu perfil y Joan lo ve al cargar sus cruces")
    func saveAndPartnerSees() async {
        let directory = makeDirectory()
        await directory.link(joanID, jesusID)
        let jesus = await session(jesusID, directory)
        #expect(await jesus.updatePaymentMethod(kind: .nequi, input: "300 123 4567"))
        #expect(jesus.me.paymentMethod == nequi)
        #expect(await directory.storedProfile(for: jesusID)?.paymentMethod == nequi)
        let joan = await session(joanID, directory)
        #expect(joan.partner.paymentMethod == nequi)
        // Al volver a entrar, Jesús ve el suyo.
        let again = await session(jesusID, directory)
        #expect(again.me.paymentMethod == nequi)
    }

    @Test("Dejarlo vacío lo borra")
    func clear() async {
        let directory = makeDirectory()
        let jesus = await session(jesusID, directory)
        #expect(await jesus.updatePaymentMethod(kind: .nequi, input: "3001234567"))
        #expect(await jesus.updatePaymentMethod(kind: .nequi, input: "   "))
        #expect(jesus.me.paymentMethod == nil)
        #expect(await directory.storedProfile(for: jesusID)?.paymentMethod == nil)
    }

    @Test("Un dato inválido no se guarda y deja el mensaje")
    func invalid() async {
        let directory = makeDirectory()
        let jesus = await session(jesusID, directory)
        #expect(await !jesus.updatePaymentMethod(kind: .nequi, input: "2001234567"))
        #expect(jesus.error == .invalidPaymentMethod(.invalidNequi))
        #expect(jesus.error?.message == "Tu Nequi debe tener 10 dígitos y empezar por 3.")
        #expect(await !jesus.updatePaymentMethod(kind: .llave, input: "mi llave"))
        #expect(jesus.error?.message == "Tu llave debe tener de 3 a 40 caracteres, sin espacios.")
        #expect(jesus.me.paymentMethod == nil)
    }

    @Test("Sin red conserva el dato anterior")
    func offline() async {
        let directory = makeDirectory()
        let jesus = await session(jesusID, directory)
        #expect(await jesus.updatePaymentMethod(kind: .nequi, input: "3001234567"))
        await directory.setFailing(true)
        #expect(await !jesus.updatePaymentMethod(kind: .llave, input: "@jesus"))
        #expect(jesus.error == .network)
        #expect(jesus.me.paymentMethod == nequi)
    }

    @Test("Al borrar la cuenta, el dato se borra con la lápida y Joan ya no lo ve")
    func deletedAccount() async {
        let directory = makeDirectory()
        await directory.link(joanID, jesusID)
        let jesus = await session(jesusID, directory)
        #expect(await jesus.updatePaymentMethod(kind: .nequi, input: "3001234567"))
        #expect(await jesus.deleteAccount())
        #expect(await directory.storedProfile(for: jesusID)?.paymentMethod == nil)
        let joan = await session(joanID, directory)
        #expect(joan.partner.isDeleted)
        #expect(joan.partner.paymentMethod == nil)
    }

    @Test("Cerrar sesión olvida el dato de quien salió")
    func signOutForgets() async {
        let directory = makeDirectory()
        let jesus = await session(jesusID, directory)
        #expect(await jesus.updatePaymentMethod(kind: .nequi, input: "3001234567"))
        await jesus.signOut()
        #expect(jesus.me.paymentMethod == nil)
    }

    // MARK: - Saldar (S5)

    private func ledger(viewer: Member, partner: Member, movements: [Movement]) -> LedgerStore {
        let session = SessionStore(
            phase: .main, me: viewer, partner: partner,
            cruces: [
                CruceLink(
                    id: MockData.joanJesusCruceID, partner: partner, myTikeVariant: .rosa,
                    linkedAt: Date(timeIntervalSince1970: 0))
            ])
        return LedgerStore(
            session: session, repository: InMemoryLedgerRepository(movements: [MockData.joanJesusCruceID: movements]),
            movements: movements)
    }

    private func expense(by payer: Member) -> Movement {
        Movement(
            payerID: payer.id, amount: 100_000, concept: "Mercado", category: .mercado,
            date: Date(timeIntervalSince1970: 86_400), createdBy: payer.id)
    }

    @Test("Cuando Joan le debe a Jesús, Saldar muestra «Págale a Jesús por Nequi: 300 123 4567»")
    func settleWhenYouOwe() {
        var jesus = MockData.jesus
        jesus.paymentMethod = nequi
        let store = ledger(viewer: MockData.joan, partner: jesus, movements: [expense(by: jesus)])
        #expect(store.partnerPaymentMethod == nequi)
        #expect(store.partnerPaymentMethod?.payPhrase(to: jesus.name) == "Págale a Jesús por Nequi: 300 123 4567")
    }

    @Test("Cuando le deben a Joan, o Jesús no lo llenó, Saldar no lo muestra")
    func settleHidden() {
        var jesus = MockData.jesus
        jesus.paymentMethod = nequi
        #expect(
            ledger(viewer: MockData.joan, partner: jesus, movements: [expense(by: MockData.joan)]).partnerPaymentMethod
                == nil)
        #expect(ledger(viewer: MockData.joan, partner: jesus, movements: []).partnerPaymentMethod == nil)
        #expect(
            ledger(viewer: MockData.joan, partner: MockData.jesus, movements: [expense(by: MockData.jesus)])
                .partnerPaymentMethod == nil)
    }

    // MARK: - "Para saldar" (S6) y tickets (S7)

    /// "Santa Marta" con Jesús (Nequi) y Joan (llave): Carlos le paga $125.000 a Jesús y $47.000 a Joan.
    private let detail = MockParches.withPayments(MockParches.parches().first { $0.id == MockParches.santaMartaID }!)
    private let cut = Date(timeIntervalSince1970: 1_800_000_000)

    @Test("Cada transferencia de «Para saldar» dice cómo pagarle a quien recibe")
    func paraSaldar() throws {
        let lines = detail.suggestedTransfers.map { ParcheTicket.paymentLine(for: $0, in: detail) }
        #expect(Set(lines.compactMap { $0 }) == ["Nequi de Jesús: 300 123 4567", "Llave Bre-B de Joan: @joan.rojas"])
        // Sin dato, nada.
        let plain = MockParches.parches().first { $0.id == MockParches.santaMartaID }!
        #expect(plain.suggestedTransfers.allSatisfy { ParcheTicket.paymentLine(for: $0, in: plain) == nil })
    }

    @Test("El ticket de Carlos (que debe) dice a quién y cómo pagarle")
    func debtorTicket() throws {
        let ticket = try #require(ParcheTicket.personal(for: MockParches.carlos, in: detail, at: cut))
        #expect(Set(ticket.paymentLines) == ["Nequi de Jesús: 300 123 4567", "Llave Bre-B de Joan: @joan.rojas"])
        // El texto que acompaña la imagen no cambia.
        let plain = MockParches.parches().first { $0.id == MockParches.santaMartaID }!
        let before = try #require(ParcheTicket.personal(for: MockParches.carlos, in: plain, at: cut))
        #expect(before.paymentLines.isEmpty)
        #expect(ticket.shareText(scheme: "cruce") == before.shareText(scheme: "cruce"))
    }

    @Test("El ticket de quien le deben y el del parche no cambian")
    func creditorAndGroupTickets() throws {
        let jesus = try #require(ParcheTicket.personal(for: MockParches.jesus, in: detail, at: cut))
        #expect(jesus.paymentLines.isEmpty)
        let plain = MockParches.parches().first { $0.id == MockParches.santaMartaID }!
        #expect(ParcheTicket.parche(detail, at: cut) == ParcheTicket.parche(plain, at: cut))
        #expect(ParcheTicket.parche(detail, at: cut).paymentLines.isEmpty)
    }
}
