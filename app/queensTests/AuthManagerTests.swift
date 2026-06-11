import XCTest
@testable import queens

final class AuthManagerTests: XCTestCase {

    func testInit_withExistingToken_setsReadyState() {
        let keychain = MockKeychain(values: [KeychainHelper.apiTokenKey: "tok_abc"])
        let manager = AuthManager(keychain: keychain)
        XCTAssertEqual(manager.state, .ready)
    }

    func testInit_withNoToken_beginsInLoadingState() {
        let keychain = MockKeychain(values: [:])
        let manager = AuthManager(keychain: keychain)
        // State starts as .loading while async registration runs
        XCTAssertEqual(manager.state, .loading)
    }
}

// MARK: - Mock

final class MockKeychain: KeychainStoring {
    var values: [String: String]
    init(values: [String: String]) { self.values = values }

    func save(_ value: String, forKey key: String) throws { values[key] = value }
    func load(forKey key: String) throws -> String {
        guard let v = values[key] else { throw KeychainError.notFound }
        return v
    }
    func exists(forKey key: String) -> Bool { values[key] != nil }
}
