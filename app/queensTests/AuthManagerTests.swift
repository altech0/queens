import XCTest
@testable import queens

final class AuthManagerTests: XCTestCase {

    func testCheckAuthState_noToken_setsNeedsRegistration() {
        let mockKeychain = MockKeychain(values: [:])
        let manager = AuthManager(keychain: mockKeychain)
        manager.checkAuthState()
        if case .needsRegistration = manager.state { } else {
            XCTFail("Expected .needsRegistration, got \(manager.state)")
        }
    }

    func testCheckAuthState_tokenExists_setsRegistered() {
        let mockKeychain = MockKeychain(values: [KeychainHelper.apiTokenKey: "tok_abc"])
        let manager = AuthManager(keychain: mockKeychain)
        manager.checkAuthState()
        if case .registered = manager.state { } else {
            XCTFail("Expected .registered, got \(manager.state)")
        }
    }

    func testInitialStateIsUnknown() {
        let manager = AuthManager(keychain: MockKeychain(values: [:]))
        if case .unknown = manager.state { } else {
            XCTFail("Expected .unknown, got \(manager.state)")
        }
    }

    func testApiToken_returnsStoredToken() throws {
        let mockKeychain = MockKeychain(values: [KeychainHelper.apiTokenKey: "tok_xyz"])
        let manager = AuthManager(keychain: mockKeychain)
        let token = try manager.apiToken()
        XCTAssertEqual(token, "tok_xyz")
    }

    func testApiToken_throwsWhenNotRegistered() {
        let manager = AuthManager(keychain: MockKeychain(values: [:]))
        XCTAssertThrowsError(try manager.apiToken())
    }
}

// MARK: - Mock

final class MockKeychain: KeychainStoring {
    var values: [String: String]
    init(values: [String: String]) { self.values = values }

    func save(_ value: String, forKey key: String) throws {
        values[key] = value
    }
    func load(forKey key: String) throws -> String {
        guard let v = values[key] else { throw KeychainError.notFound }
        return v
    }
    func exists(forKey key: String) -> Bool { values[key] != nil }
}
