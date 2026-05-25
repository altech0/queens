import Foundation
import os.log

enum AuthState {
    case unknown
    case registered
    case needsRegistration
    case registering
    case failed(String)
}

@Observable
class AuthManager {
    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.app.queens",
        category: "AuthManager"
    )

    var state: AuthState = .unknown

    private let keychain: KeychainStoring

    init(keychain: KeychainStoring = DefaultKeychainStore()) {
        self.keychain = keychain
        // Check auth state immediately on initialization
        checkAuthState()
    }

    // MARK: - Startup

    func checkAuthState() {
        if keychain.exists(forKey: KeychainHelper.apiTokenKey) {
            Self.logger.info("✅ Existing token found in Keychain")
            state = .registered
        } else {
            Self.logger.info("ℹ️ No token found — registration required")
            state = .needsRegistration
        }
    }

    // MARK: - Token Access

    func apiToken() throws -> String {
        try keychain.load(forKey: KeychainHelper.apiTokenKey)
    }

    // MARK: - Account Deletion

    func deleteAccount() async throws {
        Self.logger.info("🗑️ Starting account deletion")
        
        let token = try apiToken()
        let url = try apiURL("/user")
        
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue(token, forHTTPHeaderField: "X-API-Token")
        request.timeoutInterval = 15
        
        let (data, response) = try await URLSession.shared.data(for: request)
        try validateHTTPResponse(response, data: data)
        
        // Clear keychain after successful deletion
        KeychainHelper.delete(forKey: KeychainHelper.apiTokenKey)
        
        Self.logger.info("✅ Account deleted successfully")
        
        await MainActor.run {
            state = .needsRegistration
        }
    }

    // MARK: - Registration

    func register() async {
        state = .registering
        
        var attempts = 0
        let maxAttempts = 10
        
        while attempts < maxAttempts {
            let nickname = WordList.randomNickname()
            Self.logger.info("🔐 Attempting registration with nickname: \(nickname) (attempt \(attempts + 1))")
            
            do {
                let token = try await registerWithAPI(nickname: nickname)
                Self.logger.info("✅ Registration successful")
                
                try keychain.save(token, forKey: KeychainHelper.apiTokenKey)
                
                await MainActor.run { state = .registered }
                return
                
            } catch let error as AuthError {
                if case .serverError(409, _) = error {
                    // Nickname taken, try again with a new one
                    Self.logger.debug("⚠️ Nickname '\(nickname)' already taken, trying another...")
                    attempts += 1
                    continue
                }
                
                // Other errors should fail immediately
                Self.logger.error("❌ Registration failed: \(error.localizedDescription)")
                await MainActor.run { state = .failed(error.userMessage) }
                return
                
            } catch {
                Self.logger.error("❌ Unexpected registration error: \(error)")
                await MainActor.run { state = .failed("Registration failed. Please try again.") }
                return
            }
        }
        
        // If we exhausted all attempts
        Self.logger.error("❌ Failed to find available nickname after \(maxAttempts) attempts")
        await MainActor.run { state = .failed("Unable to complete registration. Please try again later.") }
    }

    // MARK: - Private

    private func registerWithAPI(nickname: String) async throws -> String {
        let url = try apiURL("/auth/register")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        let body = ["nickname": nickname]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        try validateHTTPResponse(response, data: data)

        struct RegisterResponse: Decodable { let api_token: String }
        let decoded = try JSONDecoder().decode(RegisterResponse.self, from: data)
        return decoded.api_token
    }

    private func apiURL(_ path: String) throws -> URL {
        let base = try Configuration.puzzleAPIURL
        let rootBase = base.hasSuffix("/puzzle")
            ? String(base.dropLast("/puzzle".count))
            : base
        guard let url = URL(string: rootBase + path) else {
            throw AuthError.invalidURL
        }
        return url
    }

    private func validateHTTPResponse(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else {
            throw AuthError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let message = json["error"] as? String {
                throw AuthError.serverError(http.statusCode, message)
            }
            throw AuthError.serverError(http.statusCode, "Unknown error")
        }
    }
}

// MARK: - Errors

enum AuthError: LocalizedError {
    case invalidURL
    case invalidResponse
    case serverError(Int, String)

    var errorDescription: String? { userMessage }

    var userMessage: String {
        switch self {
        case .invalidURL, .invalidResponse:
            return "Could not connect to server. Please try again."
        case .serverError(409, let msg) where msg.contains("Nickname"):
            return "That nickname is already taken."
        case .serverError(409, _):
            return "This device is already registered."
        case .serverError(_, let msg):
            return msg
        }
    }
}
