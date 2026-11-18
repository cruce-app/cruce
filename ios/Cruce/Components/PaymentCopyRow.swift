import CruceCore
import SwiftUI
import UIKit

/// Cómo pagarle a alguien ("Págale a Jesús por Nequi: 300 123 4567") con un botón para copiar el número o la llave.
/// Lo usan Saldar y "Para saldar". Copiar no suena ni vibra: no es uno de los seis momentos con sonido
/// (`FeedbackMoment`).
struct PaymentCopyRow: View {
    private let text: String
    private let method: PaymentMethod
    private let fontSize: CGFloat
    @State private var copied = false

    /// `text` es la frase que se muestra; debe incluir `method.displayHandle`, que VoiceOver lee por grupos de dígitos.
    init(text: String, method: PaymentMethod, fontSize: CGFloat = 14) {
        self.text = text
        self.method = method
        self.fontSize = fontSize
    }

    var body: some View {
        HStack(spacing: 10) {
            // El número no se parte entre dos líneas ("300 / 123 4567"): sus espacios no rompen la línea.
            Text(
                text.replacingOccurrences(
                    of: method.displayHandle, with: method.displayHandle.replacingOccurrences(of: " ", with: "\u{00A0}")
                )
            )
            .font(.archivo(fontSize, .extraBold))
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityLabel(text.replacingOccurrences(of: method.displayHandle, with: method.spokenHandle))
            Button {
                UIPasteboard.general.string = method.copyText
                copied = true
            } label: {
                Label(copied ? "Copiado" : "Copiar", systemImage: copied ? "checkmark" : "doc.on.doc")
                    .font(.archivo(13, .extraBold))
                    .labelStyle(.titleAndIcon)
                    .lineLimit(1)
                    .padding(.horizontal, 12)
                    .frame(height: 34)
                    .neoSurface(fill: CruceColor.surface, radius: Radius.chip, border: BorderWidth.thin)
                    // Se ve de 34 pt, pero el área táctil es de 44 pt (como `Chip`).
                    .padding(.vertical, (Spacing.minTouch - 34) / 2)
                    .contentShape(Rectangle())
                    .padding(.vertical, -(Spacing.minTouch - 34) / 2)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(copied ? "Copiado" : copyLabel)
        }
        .foregroundStyle(CruceColor.ink)
        // Vuelve a decir "Copiar" un momento después.
        .task(id: copied) {
            guard copied else { return }
            try? await Task.sleep(for: .seconds(2))
            copied = false
        }
    }

    private var copyLabel: String {
        method.kind == .nequi ? "Copiar el número de Nequi" : "Copiar la llave"
    }
}

#if DEBUG
    #Preview {
        VStack(spacing: 16) {
            PaymentCopyRow(text: MockData.jesusNequi.payPhrase(to: "Jesús"), method: MockData.jesusNequi)
            PaymentCopyRow(text: MockData.joanKey.ownerLine(name: "Joan"), method: MockData.joanKey, fontSize: 13)
        }
        .padding()
        .screenBackground()
    }
#endif
