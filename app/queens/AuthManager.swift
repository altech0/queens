import Foundation
import os.log

enum AuthState {
    case loading
    case ready
}

@Observable
class AuthManager {
    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.app.queens",
        category: "AuthManager"
    )

    var state: AuthState = .loading

    private let keychain: KeychainStoring

    init(keychain: KeychainStoring = DefaultKeychainStore()) {
        self.keychain = keychain
        if keychain.exists(forKey: KeychainHelper.apiTokenKey) {
            Self.logger.info("✅ Existing token found in Keychain")
            state = .ready
        } else {
            Self.logger.info("ℹ️ No token found — registering silently")
            Task { await register() }
        }
    }

    // MARK: - Registration

    func register() async {
        Self.logger.info("🔐 Attempting registration")
        do {
            let token = try await registerWithAPI()
            Self.logger.info("✅ Registration successful")
            try keychain.save(token, forKey: KeychainHelper.apiTokenKey)
            await MainActor.run { state = .ready }
        } catch {
            Self.logger.error("❌ Registration failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Private

    private func registerWithAPI() async throws -> String {
        let base = try Configuration.puzzleAPIURL
        let rootBase = base.hasSuffix("/puzzle") ? String(base.dropLast("/puzzle".count)) : base
        guard let url = URL(string: rootBase + "/auth/register") else { throw AuthError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30
        request.httpBody = Data("{}".utf8)

        let (data, response) = try await URLSession.shared.data(for: request)
        try validateHTTPResponse(response, data: data)

        struct RegisterResponse: Decodable { let api_token: String }
        let decoded = try JSONDecoder().decode(RegisterResponse.self, from: data)
        return decoded.api_token
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
        case .serverError(_, let msg):
            return msg
        }
    }
}
