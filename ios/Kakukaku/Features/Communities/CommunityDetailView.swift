import SwiftUI
import UIKit

struct CommunityDetailView: View {
    let community: Community

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                ZStack(alignment: .bottomLeading) {
                    LinearGradient(colors: [.kkInk, .purple, .kkCoral], startPoint: .topLeading, endPoint: .bottomTrailing)
                    VStack(alignment: .leading, spacing: 8) {
                        Text(community.iconText).font(.largeTitle.bold())
                        Text(community.name).font(.title.bold())
                        Text("\(community.memberCount.formatted()) 位成员")
                    }.foregroundStyle(.white).padding(22)
                }.frame(height: 210).clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                Text(community.description).font(.body).lineSpacing(5)
                SectionTitle(eyebrow: "Cocreate records", title: "提案、投票与采纳")
                ContentUnavailableView("原生帖子流开发中", systemImage: "text.bubble", description: Text("当前可在网页社区中查看完整提案、嵌套评论和贡献记录。"))
                Button("打开网页社区") {
                    if let url = URL(string: "https://kakukaku.cn/communities/\(community.slug)") { UIApplication.shared.open(url) }
                }.buttonStyle(.borderedProminent).tint(.kkCoral)
            }.padding()
        }
        .navigationTitle(community.name).navigationBarTitleDisplayMode(.inline)
    }
}
