import XCTest
@testable import queens

final class NicknameValidationTests: XCTestCase {

    // Mirror of Worker validateNickname rules — keep in sync
    func isValid(_ s: String) -> Bool {
        let trimmed = s.trimmingCharacters(in: .whitespaces)
        guard trimmed.count >= 2, trimmed.count <= 20 else { return false }
        let forbidden = CharacterSet(charactersIn: "<>&\"'`/\\")
        guard trimmed.unicodeScalars.allSatisfy({ !forbidden.contains($0) }) else { return false }
        guard !trimmed.contains("  ") else { return false }
        let allowed = CharacterSet.alphanumerics
            .union(CharacterSet(charactersIn: " -_"))
        return trimmed.unicodeScalars.allSatisfy { allowed.contains($0) }
    }

    func testValidNicknames() {
        XCTAssertTrue(isValid("PuzzleFox"))
        XCTAssertTrue(isValid("ab"))
        XCTAssertTrue(isValid("Star Player"))
        XCTAssertTrue(isValid("Star-Player_1"))
        XCTAssertTrue(isValid(String(repeating: "A", count: 20)))
    }

    func testTooShort() {
        XCTAssertFalse(isValid("a"))
        XCTAssertFalse(isValid(""))
    }

    func testTooLong() {
        XCTAssertFalse(isValid(String(repeating: "A", count: 21)))
    }

    func testInjectionCharacters() {
        XCTAssertFalse(isValid("<script>"))
        XCTAssertFalse(isValid("foo<bar"))
        XCTAssertFalse(isValid("\"name\""))
        XCTAssertFalse(isValid("it's"))
    }

    func testConsecutiveSpaces() {
        XCTAssertFalse(isValid("foo  bar"))
    }
}
