import Foundation

/// Por qué no se puede guardar lo que se escribió en "Cómo te pagan".
public enum PaymentMethodProblem: Error, Equatable, Sendable {
    case invalidNequi
    case invalidKey

    public var message: String {
        switch self {
        case .invalidNequi: "Tu Nequi debe tener 10 dígitos y empezar por 3."
        case .invalidKey: "Tu llave debe tener de 3 a 40 caracteres, sin espacios."
        }
    }
}

/// Cómo le pagan a una persona (`profiles.payment_kind` y `payment_handle`): su Nequi o su llave Bre-B. Las reglas son
/// las de la base (`20261118110000_como_pagarme.sql`); la app las repite para avisar antes de enviar.
public struct PaymentMethod: Codable, Hashable, Sendable {
    /// Los `rawValue` son los de `payment_kind` en la base.
    public enum Kind: String, Codable, CaseIterable, Hashable, Sendable {
        case nequi
        case llave

        /// "Nequi" o "Llave Bre-B".
        public var title: String {
            switch self {
            case .nequi: "Nequi"
            case .llave: "Llave Bre-B"
            }
        }
    }

    /// Largo de una llave (supuesto del cambio como-pagarme: de 3 a 40 caracteres, sin espacios).
    public static let keyLengths = 3...40
    /// Dígitos de un Nequi.
    public static let nequiDigits = 10

    public let kind: Kind
    /// El Nequi en 10 dígitos sin espacios ("3001234567") o la llave tal como se guardó.
    public let handle: String

    public init(kind: Kind, handle: String) {
        self.kind = kind
        self.handle = handle
    }

    /// Lo que llega de la base. `nil` si no hay dato o si su formato no es uno que la app conozca (no se muestra).
    public init?(storedKind: String?, handle: String?) {
        guard let kind = storedKind.flatMap(Kind.init(rawValue:)), let handle,
            Self.isValid(kind: kind, handle: handle)
        else { return nil }
        self.init(kind: kind, handle: handle)
    }

    /// Lo escrito en Tu perfil, en la forma en que se guarda. Un Nequi se escribe con espacios, guiones, puntos,
    /// paréntesis o el +57 si se quiere; una llave pierde los espacios de los extremos.
    public static func make(kind: Kind, input: String) -> Result<PaymentMethod, PaymentMethodProblem> {
        switch kind {
        case .nequi:
            var digits = input.filter { !" -.()\t\n".contains($0) }
            if digits.hasPrefix("+57") {
                digits.removeFirst(3)
            } else if digits.count == nequiDigits + 2, digits.hasPrefix("57") {
                digits.removeFirst(2)
            }
            guard isValid(kind: .nequi, handle: digits) else { return .failure(.invalidNequi) }
            return .success(PaymentMethod(kind: .nequi, handle: digits))
        case .llave:
            let key = input.trimmingCharacters(in: .whitespacesAndNewlines)
            guard isValid(kind: .llave, handle: key) else { return .failure(.invalidKey) }
            return .success(PaymentMethod(kind: .llave, handle: key))
        }
    }

    /// Igual que el `check` `payment_handle_format` de la base.
    static func isValid(kind: Kind, handle: String) -> Bool {
        switch kind {
        case .nequi:
            handle.count == nequiDigits && handle.first == "3" && handle.allSatisfy { ("0"..."9").contains($0) }
        case .llave:
            keyLengths.contains(handle.count) && !handle.contains(where: \.isWhitespace)
        }
    }

    /// "300 123 4567", o la llave.
    public var displayHandle: String {
        guard kind == .nequi else { return handle }
        let digits = Array(handle)
        return [digits[0..<3], digits[3..<6], digits[6...]].map { String($0) }.joined(separator: " ")
    }

    /// Lo que se copia: el Nequi sin espacios (como lo pide Nequi) o la llave.
    public var copyText: String { handle }

    /// Para VoiceOver: el Nequi dígito por dígito, por grupos ("3 0 0, 1 2 3, 4 5 6 7"); la llave tal cual.
    public var spokenHandle: String {
        guard kind == .nequi else { return handle }
        return displayHandle.split(separator: " ").map { $0.map(String.init).joined(separator: " ") }
            .joined(separator: ", ")
    }

    /// En Saldar, a quien debe: "Págale a Jesús por Nequi: 300 123 4567" o "Págale a Jesús a su llave Bre-B: @jesus".
    public func payPhrase(to name: String) -> String {
        switch kind {
        case .nequi: "Págale a \(name) por Nequi: \(displayHandle)"
        case .llave: "Págale a \(name) a su llave Bre-B: \(displayHandle)"
        }
    }

    /// En "Para saldar" y en el ticket (los ven terceros): "Nequi de Ana: 300 123 4567" o "Llave Bre-B de Ana: @ana".
    public func ownerLine(name: String) -> String {
        "\(kind.title) de \(name): \(displayHandle)"
    }
}
