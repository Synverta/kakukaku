import Foundation
import Observation

@MainActor
@Observable
final class SessionStore {
    var user: AuthUser?
    var isRestoring = false
    var errorMessage: String?

    var isAuthenticated: Bool { user != nil }

    func restore() async {
        guard KeychainStore.readToken() != nil else { return }
        isRestoring = true
        defer { isRestoring = false }
        do {
            let response: CurrentUserResponse = try await APIClient.shared.get("auth/me", authenticated: true)
            user = response.user
        } catch {
            KeychainStore.deleteToken()
        }
    }

    func login(username: String, password: String) async {
        errorMessage = nil
        do {
            let response: AuthResponse = try await APIClient.shared.post("auth/login", body: LoginRequest(username: username, password: password))
            KeychainStore.saveToken(response.token)
            user = response.user
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func logout() {
        KeychainStore.deleteToken()
        user = nil
    }
}
