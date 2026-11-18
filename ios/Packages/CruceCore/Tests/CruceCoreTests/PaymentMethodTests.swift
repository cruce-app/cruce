import Foundation
import Testing

@testable import CruceCore

/// Cómo te pagan (cambio como-pagarme): Nequi o llave Bre-B, cómo se escribe, cómo se muestra y dónde aparece.
@Suite("Cómo te pagan")
struct PaymentMethodTests {
    // MARK: - Validar y mostrar (S1)

    @Test(
        "Un Nequi se guarda en 10 dígitos aunque se escriba con espacios, guiones o el +57",
        arguments: ["3001234567", "300 123 4567", "300-123-4567", " 300.123.4567 ", "+57 300 123 4567", "573001234567"])
    func nequiNormalized(input: String) throws {
        let method = try PaymentMethod.make(kind: .nequi, input: input).get()
        #expect(method == PaymentMethod(kind: .nequi, handle: "3001234567"))
        #expect(method.displayHandle == "300 123 4567")
        #expect(method.copyText == "3001234567")
    }

    @Test(
        "Un Nequi que no tiene 10 dígitos o no empieza por 3 se rechaza con su mensaje",
        arguments: ["2001234567", "300 123", "30012345678", "300123456a", "", "nequi"])
    func nequiRejected(input: String) {
        #expect(PaymentMethod.make(kind: .nequi, input: input) == .failure(.invalidNequi))
        #expect(PaymentMethodProblem.invalidNequi.message == "Tu Nequi debe tener 10 dígitos y empezar por 3.")
    }

    @Test("Una llave se guarda sin los espacios de los extremos", arguments: ["@ana.r", "  @ana.r ", "\n@ana.r"])
    func keyTrimmed(input: String) throws {
        let method = try PaymentMethod.make(kind: .llave, input: input).get()
        #expect(method == PaymentMethod(kind: .llave, handle: "@ana.r"))
        #expect(method.displayHandle == "@ana.r")
        #expect(method.copyText == "@ana.r")
    }

    @Test("Una llave de 3 y una de 40 caracteres sirven")
    func keyLimits() {
        #expect((try? PaymentMethod.make(kind: .llave, input: "abc").get()) != nil)
        #expect((try? PaymentMethod.make(kind: .llave, input: String(repeating: "a", count: 40)).get()) != nil)
    }

    @Test(
        "Una llave corta, larga o con espacios por dentro se rechaza con su mensaje",
        arguments: ["ab", "mi llave", String(repeating: "a", count: 41), ""])
    func keyRejected(input: String) {
        #expect(PaymentMethod.make(kind: .llave, input: input) == .failure(.invalidKey))
        #expect(PaymentMethodProblem.invalidKey.message == "Tu llave debe tener de 3 a 40 caracteres, sin espacios.")
    }

    @Test("Lo que llega de la base con un formato que la app no conoce se ignora")
    func storedUnknown() {
        #expect(
            PaymentMethod(storedKind: "nequi", handle: "3001234567")
                == PaymentMethod(kind: .nequi, handle: "3001234567"))
        #expect(PaymentMethod(storedKind: "llave", handle: "@ana") == PaymentMethod(kind: .llave, handle: "@ana"))
        #expect(PaymentMethod(storedKind: "daviplata", handle: "3001234567") == nil)
        #expect(PaymentMethod(storedKind: "nequi", handle: "123") == nil)
        #expect(PaymentMethod(storedKind: nil, handle: nil) == nil)
        #expect(PaymentMethod(storedKind: "nequi", handle: nil) == nil)
    }

    @Test("VoiceOver lee el Nequi por grupos de dígitos")
    func spoken() {
        #expect(PaymentMethod(kind: .nequi, handle: "3001234567").spokenHandle == "3 0 0, 1 2 3, 4 5 6 7")
        #expect(PaymentMethod(kind: .llave, handle: "@ana.r").spokenHandle == "@ana.r")
    }

    // MARK: - Frases (S5, S6)

    @Test("Saldar: «Págale a Jesús por Nequi: 300 123 4567»")
    func payPhrase() {
        #expect(
            PaymentMethod(kind: .nequi, handle: "3001234567").payPhrase(to: "Jesús")
                == "Págale a Jesús por Nequi: 300 123 4567")
        #expect(
            PaymentMethod(kind: .llave, handle: "@jesus").payPhrase(to: "Jesús")
                == "Págale a Jesús a su llave Bre-B: @jesus")
    }

    @Test("Para saldar y tickets: «Nequi de Ana: 300 123 4567»")
    func ownerLine() {
        #expect(
            PaymentMethod(kind: .nequi, handle: "3001234567").ownerLine(name: "Ana") == "Nequi de Ana: 300 123 4567")
        #expect(PaymentMethod(kind: .llave, handle: "@ana.r").ownerLine(name: "Ana") == "Llave Bre-B de Ana: @ana.r")
    }

    // MARK: - JSON (S2): con y sin los campos nuevos

    @Test("my_cruces trae cómo pagarle a la otra persona; una base sin la migración no lo trae")
    func cruceRows() throws {
        let json = """
            [
              {"ledger_id": "aaaaaaaa-0000-0000-0000-000000000002", "partner_id": "33333333-3333-3333-3333-333333333333",
               "partner_name": "Jesús", "my_tike": "rosa", "my_avatar": "yellow", "partner_tike": "verde",
               "partner_avatar": "violet", "linked_at": "2026-10-27T10:00:00+00:00",
               "partner_payment_kind": "nequi", "partner_payment_handle": "3001234567"},
              {"ledger_id": "aaaaaaaa-0000-0000-0000-000000000001", "partner_id": "11111111-1111-1111-1111-111111111111",
               "partner_name": "Ana", "my_tike": "verde", "my_avatar": "violet", "partner_tike": "rosa",
               "partner_avatar": "yellow", "linked_at": "2026-10-26T10:00:00+00:00",
               "partner_payment_kind": null, "partner_payment_handle": null},
              {"ledger_id": "aaaaaaaa-0000-0000-0000-000000000003", "partner_id": "44444444-4444-4444-4444-444444444444",
               "partner_name": "Pedro", "my_tike": "verde", "my_avatar": "violet", "partner_tike": "rosa",
               "partner_avatar": "yellow", "linked_at": "2026-10-25T10:00:00+00:00"}
            ]
            """
        let links = try CruceRemote.cruceLinks(from: Data(json.utf8))
        #expect(links[0].partner.paymentMethod == PaymentMethod(kind: .nequi, handle: "3001234567"))
        #expect(links[1].partner.paymentMethod == nil)
        #expect(links[2].partner.paymentMethod == nil)
    }

    @Test("Los del parche traen cómo pagarles; quien está sin la app o una base vieja no")
    func participants() throws {
        let withPayment = """
            {"id": "20000000-0000-0000-0000-000000000002", "user_id": "00000000-0000-0000-0000-0000000000a1",
             "display_name": "Ana", "claim_code": null, "joined_at": "2026-10-20T10:00:00+00:00",
             "avatar_color": "pink", "participant_username": "ana",
             "participant_payment": {"kind": "llave", "handle": "@ana.r"}}
            """
        let ana = try ParcheRemote.participant(from: Data(withPayment.utf8))
        #expect(ana.paymentMethod == PaymentMethod(kind: .llave, handle: "@ana.r"))
        let withoutApp = """
            {"id": "20000000-0000-0000-0000-000000000003", "user_id": null, "display_name": "Carlos",
             "claim_code": "SOY-K7QX2M", "joined_at": "2026-10-20T10:00:00+00:00", "participant_payment": null}
            """
        #expect(try ParcheRemote.participant(from: Data(withoutApp.utf8)).paymentMethod == nil)
        let oldBase = """
            {"id": "20000000-0000-0000-0000-000000000004", "user_id": "00000000-0000-0000-0000-0000000000a2",
             "display_name": "Jesús", "claim_code": null, "joined_at": "2026-10-20T10:00:00+00:00"}
            """
        #expect(try ParcheRemote.participant(from: Data(oldBase.utf8)).paymentMethod == nil)
        #expect(ParcheRemote.detailSelect.contains("parche_participants(*, participant_username, participant_payment)"))
    }

    @Test("Lo guardado en el teléfono antes de este cambio se lee igual, y lo nuevo se conserva")
    func storedMembers() throws {
        let old =
            #"{"id": "00000000-0000-0000-0000-00000000000B", "name": "Jesús", "avatarColor": "violet", "tikeVariant": "verde"}"#
        #expect(try JSONDecoder().decode(Member.self, from: Data(old.utf8)).paymentMethod == nil)
        var jesus = MockData.jesus
        jesus.paymentMethod = PaymentMethod(kind: .nequi, handle: "3001234567")
        let copy = try JSONDecoder().decode(Member.self, from: JSONEncoder().encode(jesus))
        #expect(copy == jesus)

        let oldPerson = """
            {"id": "20000000-0000-0000-0000-000000000004", "displayName": "Ana", "joinedAt": 0}
            """
        #expect(try JSONDecoder().decode(ParcheParticipant.self, from: Data(oldPerson.utf8)).paymentMethod == nil)
    }
}
