import CruceCore

extension Money {
    /// Un monto como lo dice VoiceOver: "20000 pesos", "más 18000 pesos" o "menos 50000 pesos". Sin el signo `$` (que
    /// puede oírse como "dólares") ni el punto de los miles (que puede oírse como decimal); igual que el teclado de
    /// montos (`AmountEntry.spokenValue`).
    static func spoken(_ value: Int, showsSign: Bool = false) -> String {
        let amount = AmountEntry.spokenValue(Int(value.magnitude))
        guard showsSign, value != 0 else { return amount }
        return "\(value > 0 ? "más" : "menos") \(amount)"
    }
}
