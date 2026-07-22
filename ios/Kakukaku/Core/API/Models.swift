import Foundation

struct CreatorSummary: Codable, Hashable {
    let name: String
    let avatarLetter: String
}

struct Video: Codable, Identifiable, Hashable {
    let id: Int
    let title: String
    let description: String
    let category: String
    let tags: [String]
    let cover: String
    let videoSrc: String
    let embedUrl: String
    let duration: String
    let views: Int
    let likes: Int
    let danmakuCount: Int
    let publishedAt: String?
    let creator: CreatorSummary?
}

struct VideoListResponse: Decodable { let videos: [Video] }
struct VideoResponse: Decodable { let video: Video }

struct BenefitTier: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    let tokens: Int
    let perks: [String]
    let highlight: Bool?
}

struct TokenPlanItem: Codable, Hashable { let label: String; let percent: Int }
struct CampaignMilestone: Codable, Hashable { let label: String; let tokens: Int; let status: String }

struct Campaign: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let creator: String
    let creatorAvatar: String
    let category: String
    let summary: String
    let cover: String
    let goalTokens: Int
    let raisedTokens: Int
    let backers: Int
    let daysLeft: Int
    let tags: [String]
    let description: String
    let tokenPlan: [TokenPlanItem]
    let perks: [BenefitTier]
    let milestones: [CampaignMilestone]
    let costSavingPercent: Int
}

struct CampaignListResponse: Decodable { let campaigns: [Campaign] }
struct CampaignResponse: Decodable { let campaign: Campaign }

struct Community: Codable, Identifiable, Hashable {
    let id: Int
    let slug: String
    let name: String
    let description: String
    let category: String
    let iconText: String
    let accent: String
    let memberCount: Int
    let postCount: Int
    let weeklyPosts: Int
    let isFeatured: Bool
    let joined: Bool
}

struct CommunityListResponse: Decodable { let communities: [Community] }
struct CommunityResponse: Decodable { let community: Community }

struct AuthUser: Codable, Identifiable, Hashable {
    let id: Int
    let username: String
    let email: String?
    let avatarLetter: String
    let avatarUrl: String
    let bio: String
}

struct AuthResponse: Decodable { let token: String; let user: AuthUser }
struct CurrentUserResponse: Decodable { let user: AuthUser }
struct LoginRequest: Encodable { let username: String; let password: String }
