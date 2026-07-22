import AVKit
import SwiftUI

struct VideoDetailView: View {
    let video: Video
    @State private var player: AVPlayer?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if let player {
                    VideoPlayer(player: player)
                        .aspectRatio(16 / 9, contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                } else {
                    RemoteArtwork(urlString: video.cover, title: video.category)
                        .aspectRatio(16 / 9, contentMode: .fit)
                }
                Text(video.title).font(.title2.bold())
                HStack {
                    Label(video.creator?.name ?? "创作者", systemImage: "person.crop.circle.fill")
                    Spacer()
                    Text("\(video.views.formatted()) 播放")
                }.font(.subheadline).foregroundStyle(.secondary)
                Text(video.description).font(.body).lineSpacing(5)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack { ForEach(video.tags, id: \.self) { Text($0).font(.caption.bold()).padding(.horizontal, 12).padding(.vertical, 7).background(Color.kkSurface, in: Capsule()) } }
                }
                HStack(spacing: 12) {
                    Label(video.likes.formatted(), systemImage: "hand.thumbsup")
                    Label(video.danmakuCount.formatted(), systemImage: "text.bubble")
                }.font(.subheadline).foregroundStyle(.secondary)
            }.padding()
        }
        .navigationTitle("播放")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            guard let url = URL(string: video.videoSrc), !video.videoSrc.isEmpty else { return }
            player = AVPlayer(url: url)
        }
        .onDisappear { player?.pause() }
    }
}
