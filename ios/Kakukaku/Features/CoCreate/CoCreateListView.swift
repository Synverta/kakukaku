import SwiftUI

@MainActor
@Observable
final class CoCreateModel {
    var campaigns: [Campaign] = []
    var isLoading = false
    var errorMessage: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: CampaignListResponse = try await APIClient.shared.get("campaigns")
            campaigns = response.campaigns
            errorMessage = nil
        } catch { errorMessage = error.localizedDescription }
    }
}

struct CoCreateListView: View {
    @State private var model = CoCreateModel()

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 18) {
                SectionTitle(eyebrow: "IP Cocreate", title: "正在生长的共创项目")
                Text("参与提案、了解制作进度，并选择有明确交付内容的数字权益。")
                    .font(.subheadline).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .leading)
                if model.isLoading && model.campaigns.isEmpty { ProgressView().padding(80) }
                if let message = model.errorMessage, model.campaigns.isEmpty {
                    ContentUnavailableView("共创项目加载失败", systemImage: "sparkles", description: Text(message))
                }
                ForEach(model.campaigns) { campaign in
                    NavigationLink(value: campaign) { CampaignCard(campaign: campaign) }.buttonStyle(.plain)
                }
            }.padding()
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("共创")
        .navigationDestination(for: Campaign.self) { CampaignDetailView(campaign: $0) }
        .refreshable { await model.load() }
        .task { await model.load() }
    }
}

private struct CampaignCard: View {
    let campaign: Campaign
    private var progress: Double { min(1, Double(campaign.raisedTokens) / Double(max(campaign.goalTokens, 1))) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            RemoteArtwork(urlString: campaign.cover, title: campaign.category).frame(height: 180)
            Text(campaign.title).font(.headline)
            Text(campaign.summary).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
            ProgressView(value: progress).tint(.kkCoral)
            HStack {
                Text("\(Int(progress * 100))% 制作资源")
                Spacer()
                Text("\(campaign.backers.formatted()) 人参与")
            }.font(.caption).foregroundStyle(.secondary)
        }
        .padding(12).background(.background, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}
