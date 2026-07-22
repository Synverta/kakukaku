import SwiftUI

struct RootView: View {
    var body: some View {
        TabView {
            NavigationStack { VideoFeedView() }
                .tabItem { Label("视频", systemImage: "play.rectangle.fill") }

            NavigationStack { CoCreateListView() }
                .tabItem { Label("共创", systemImage: "sparkles") }

            NavigationStack { CommunityListView() }
                .tabItem { Label("社区", systemImage: "person.3.fill") }

            NavigationStack { AccountView() }
                .tabItem { Label("我的", systemImage: "person.crop.circle.fill") }
        }
        .tint(.kkCoral)
    }
}
