import SwiftUI

@MainActor
@Observable
final class VideoFeedModel {
    var videos: [Video] = []
    var isLoading = false
    var errorMessage: String?

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let response: VideoListResponse = try await APIClient.shared.get("videos?limit=30")
            videos = response.videos
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct VideoFeedView: View {
    @State private var model = VideoFeedModel()
    @State private var query = ""

    private var filtered: [Video] {
        query.isEmpty ? model.videos : model.videos.filter {
            $0.title.localizedCaseInsensitiveContains(query) || $0.creator?.name.localizedCaseInsensitiveContains(query) == true
        }
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 18) {
                hero
                SectionTitle(eyebrow: "Latest works", title: "创作者最新发布")
                if model.isLoading && model.videos.isEmpty {
                    ProgressView("正在加载作品")
                        .frame(maxWidth: .infinity, minHeight: 180)
                } else if let message = model.errorMessage, model.videos.isEmpty {
                    ContentUnavailableView("无法加载视频", systemImage: "wifi.exclamationmark", description: Text(message))
                } else {
                    ForEach(filtered) { video in
                        NavigationLink(value: video) { VideoCard(video: video) }
                            .buttonStyle(.plain)
                    }
                }
            }
            .padding()
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("咔库咔库")
        .navigationDestination(for: Video.self) { VideoDetailView(video: $0) }
        .searchable(text: $query, prompt: "搜索作品或创作者")
        .refreshable { await model.load() }
        .task { await model.load() }
    }

    private var hero: some View {
        ZStack(alignment: .bottomLeading) {
            LinearGradient(colors: [.kkInk, .purple.opacity(0.85), .kkCoral], startPoint: .topLeading, endPoint: .bottomTrailing)
            VStack(alignment: .leading, spacing: 10) {
                Text("ORIGINAL · COCREATE")
                    .font(.caption.bold()).tracking(1.4)
                Text("让每一份灵感，\n都有走向成片的路径。")
                    .font(.title.bold())
                Text("看作品，也看它如何由社区共同完成。")
                    .font(.subheadline).foregroundStyle(.white.opacity(0.8))
            }
            .foregroundStyle(.white)
            .padding(22)
        }
        .frame(height: 220)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
    }
}

private struct VideoCard: View {
    let video: Video

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            RemoteArtwork(urlString: video.cover, title: video.category)
                .frame(height: 190)
                .overlay(alignment: .bottomTrailing) {
                    Text(video.duration).font(.caption.bold()).padding(6).background(.black.opacity(0.72), in: Capsule()).foregroundStyle(.white).padding(10)
                }
            Text(video.title).font(.headline).foregroundStyle(Color.kkInk).lineLimit(2)
            HStack {
                Label(video.creator?.name ?? "创作者", systemImage: "person.crop.circle")
                Spacer()
                Text("\(video.views.formatted()) 播放")
            }
            .font(.caption).foregroundStyle(.secondary)
        }
        .padding(12)
        .background(.background, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}

struct RemoteArtwork: View {
    let urlString: String
    let title: String

    var body: some View {
        if let url = URL(string: urlString), ["http", "https"].contains(url.scheme) {
            AsyncImage(url: url) { phase in
                switch phase {
                case let .success(image): image.resizable().scaledToFill()
                default: placeholder
                }
            }
            .clipped()
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        } else { placeholder }
    }

    private var placeholder: some View {
        ZStack {
            LinearGradient(colors: [.kkCoral, .purple, .kkInk], startPoint: .topLeading, endPoint: .bottomTrailing)
            Text(title).font(.title3.bold()).foregroundStyle(.white)
        }
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}
