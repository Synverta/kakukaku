import SwiftUI

extension Color {
    static let kkCoral = Color(red: 1, green: 0.42, blue: 0.31)
    static let kkInk = Color(red: 0.08, green: 0.09, blue: 0.16)
    static let kkMint = Color(red: 0.09, green: 0.71, blue: 0.63)
    static let kkSurface = Color(uiColor: .secondarySystemBackground)
}

struct SectionTitle: View {
    let eyebrow: String
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(eyebrow.uppercased())
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.kkCoral)
                .tracking(1.2)
            Text(title)
                .font(.title2.bold())
                .foregroundStyle(Color.kkInk)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
