import SwiftUI
import UIKit

struct CampaignDetailView: View {
    let campaign: Campaign

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                RemoteArtwork(urlString: campaign.cover, title: campaign.category).frame(height: 240)
                Text(campaign.title).font(.title.bold())
                Text("由 \(campaign.creator) 发起 · \(campaign.daysLeft) 天")
                    .font(.subheadline).foregroundStyle(.secondary)
                Text(campaign.description).lineSpacing(5)
                SectionTitle(eyebrow: "Roadmap", title: "制作里程碑")
                ForEach(campaign.milestones, id: \.label) { milestone in
                    HStack(spacing: 14) {
                        Image(systemName: milestone.status == "done" ? "checkmark.circle.fill" : milestone.status == "active" ? "circle.dotted.circle.fill" : "circle")
                            .foregroundStyle(milestone.status == "done" ? Color.kkMint : Color.kkCoral)
                        VStack(alignment: .leading) {
                            Text(milestone.label).font(.headline)
                            Text(milestone.status == "done" ? "已完成" : milestone.status == "active" ? "进行中" : "待推进").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
                SectionTitle(eyebrow: "Digital benefits", title: "数字权益")
                ForEach(campaign.perks) { tier in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack { Text(tier.name).font(.headline); Spacer(); Text("¥ \(Double(tier.tokens) / 100, format: .number.precision(.fractionLength(2)))").font(.headline).foregroundStyle(Color.kkCoral) }
                        ForEach(tier.perks, id: \.self) { Label($0, systemImage: "checkmark").font(.subheadline) }
                        Button("在网站完成购买") { if let url = URL(string: "https://kakukaku.cn/cocreate/project/\(campaign.id)") { UIApplication.shared.open(url) } }
                            .buttonStyle(.borderedProminent).tint(.kkCoral)
                    }
                    .padding().background(Color.kkSurface, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
            }.padding()
        }
        .navigationTitle("项目详情").navigationBarTitleDisplayMode(.inline)
    }
}
