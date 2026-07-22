import SwiftUI

struct AccountView: View {
    @Environment(SessionStore.self) private var session
    @State private var showingLogin = false

    var body: some View {
        Group {
            if let user = session.user {
                List {
                    Section {
                        HStack(spacing: 16) {
                            Text(user.avatarLetter.isEmpty ? String(user.username.prefix(1)) : user.avatarLetter)
                                .font(.title.bold()).foregroundStyle(.white).frame(width: 64, height: 64).background(Color.kkCoral, in: Circle())
                            VStack(alignment: .leading) { Text(user.username).font(.title3.bold()); Text(user.email ?? "未绑定邮箱").font(.caption).foregroundStyle(.secondary) }
                        }.padding(.vertical, 8)
                    }
                    Section("创作与权益") {
                        Link(destination: URL(string: "https://kakukaku.cn/creator")!) { Label("创作者中心", systemImage: "wand.and.stars") }
                        Link(destination: URL(string: "https://kakukaku.cn/my-entitlements")!) { Label("数字权益与交付", systemImage: "shippingbox") }
                        Link(destination: URL(string: "https://kakukaku.cn/my-orders")!) { Label("订单与退款", systemImage: "doc.text") }
                    }
                    Section { Button("退出登录", role: .destructive) { session.logout() } }
                }
            } else {
                ContentUnavailableView {
                    Label("登录咔库咔库", systemImage: "person.crop.circle.badge.plus")
                } description: {
                    Text("登录后同步账号，并参与社区与创作。")
                } actions: {
                    Button("登录") { showingLogin = true }.buttonStyle(.borderedProminent).tint(.kkCoral)
                }
            }
        }
        .navigationTitle("我的")
        .sheet(isPresented: $showingLogin) { LoginView() }
    }
}
