import SwiftUI

@MainActor
@Observable
final class CommunityListModel {
    var communities: [Community] = []
    var isLoading = false
    var errorMessage: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: CommunityListResponse = try await APIClient.shared.get("communities")
            communities = response.communities
            errorMessage = nil
        } catch { errorMessage = error.localizedDescription }
    }
}

struct CommunityListView: View {
    @State private var model = CommunityListModel()
    @State private var query = ""

    private var filtered: [Community] {
        query.isEmpty ? model.communities : model.communities.filter { $0.name.localizedCaseInsensitiveContains(query) || $0.description.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        List(filtered) { community in
            NavigationLink(value: community) {
                HStack(spacing: 14) {
                    Text(community.iconText.isEmpty ? String(community.name.prefix(1)) : community.iconText)
                        .font(.headline).foregroundStyle(.white).frame(width: 52, height: 52)
                        .background(LinearGradient(colors: [.kkCoral, .purple], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 16))
                    VStack(alignment: .leading, spacing: 4) {
                        Text(community.name).font(.headline)
                        Text(community.description).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                        Text("\(community.memberCount.formatted()) 成员 · 本周 \(community.weeklyPosts) 条").font(.caption2).foregroundStyle(Color.kkCoral)
                    }
                }.padding(.vertical, 5)
            }
        }
        .navigationTitle("共创社区")
        .navigationDestination(for: Community.self) { CommunityDetailView(community: $0) }
        .searchable(text: $query, prompt: "搜索社区")
        .refreshable { await model.load() }
        .task { await model.load() }
        .overlay { if model.isLoading && model.communities.isEmpty { ProgressView() } }
    }
}
