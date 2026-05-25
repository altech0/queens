import XCTest
@testable import queens

final class KeychainHelperTests: XCTestCase {
    private let testKey = "queens.test.keychain.key"

    override func tearDown() {
        KeychainHelper.delete(forKey: testKey)
    }

    func testSaveAndLoad() throws {
        try KeychainHelper.save("test-token-123", forKey: testKey)
        let loaded = try KeychainHelper.load(forKey: testKey)
        XCTAssertEqual(loaded, "test-token-123")
    }

    func testOverwrite() throws {
        try KeychainHelper.save("first", forKey: testKey)
        try KeychainHelper.save("second", forKey: testKey)
        let loaded = try KeychainHelper.load(forKey: testKey)
        XCTAssertEqual(loaded, "second")
    }

    func testDeletedKeyThrows() throws {
        try KeychainHelper.save("value", forKey: testKey)
        KeychainHelper.delete(forKey: testKey)
        XCTAssertThrowsError(try KeychainHelper.load(forKey: testKey)) { error in
            XCTAssertEqual(error as? KeychainError, KeychainError.notFound)
        }
    }

    func testExistsReturnsFalseForMissingKey() {
        XCTAssertFalse(KeychainHelper.exists(forKey: testKey))
    }

    func testExistsReturnsTrueAfterSave() throws {
        try KeychainHelper.save("x", forKey: testKey)
        XCTAssertTrue(KeychainHelper.exists(forKey: testKey))
    }
}
