import Foundation

enum APIError: LocalizedError {
    case invalidConfiguration
    case invalidResponse
    case server(Int, String)

    var errorDescription: String? {
        switch self {
        case .invalidConfiguration: "API 地址配置无效"
        case .invalidResponse: "服务器响应无法解析"
        case let .server(_, message): message
        }
    }
}

struct APIErrorPayload: Decodable {
    let error: String?
    let message: String?
}

final class APIClient: Sendable {
    static let shared = APIClient()

    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private let session: URLSession

    private init() {
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        encoder = JSONEncoder()
        session = URLSession(configuration: .default)
    }

    private var baseURL: URL? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String else { return nil }
        return URL(string: value)
    }

    func get<Response: Decodable>(_ path: String, authenticated: Bool = false) async throws -> Response {
        try await request(path, method: "GET", body: Optional<EmptyBody>.none, authenticated: authenticated)
    }

    func post<Body: Encodable, Response: Decodable>(_ path: String, body: Body, authenticated: Bool = false) async throws -> Response {
        try await request(path, method: "POST", body: body, authenticated: authenticated)
    }

    private func request<Body: Encodable, Response: Decodable>(
        _ path: String,
        method: String,
        body: Body?,
        authenticated: Bool
    ) async throws -> Response {
        guard let baseURL else {
            throw APIError.invalidConfiguration
        }
        let normalizedPath = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        var components: URLComponents?
        if let separator = normalizedPath.firstIndex(of: "?") {
            let resourcePath = String(normalizedPath[..<separator])
            components = URLComponents(url: baseURL.appendingPathComponent(resourcePath), resolvingAgainstBaseURL: false)
            components?.percentEncodedQuery = String(normalizedPath[normalizedPath.index(after: separator)...])
        } else {
            components = URLComponents(url: baseURL.appendingPathComponent(normalizedPath), resolvingAgainstBaseURL: false)
        }
        guard let url = components?.url else { throw APIError.invalidConfiguration }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if authenticated, let token = KeychainStore.readToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body { request.httpBody = try encoder.encode(body) }

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard 200..<300 ~= http.statusCode else {
            let payload = try? decoder.decode(APIErrorPayload.self, from: data)
            throw APIError.server(http.statusCode, payload?.message ?? payload?.error ?? "请求失败")
        }
        do { return try decoder.decode(Response.self, from: data) }
        catch { throw APIError.invalidResponse }
    }
}

private struct EmptyBody: Encodable {}
