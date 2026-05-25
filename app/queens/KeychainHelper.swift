import Foundation
import Security

enum KeychainError: Error {
    case unexpectedStatus(OSStatus)
    case notFound
    case encodingError
}

extension KeychainError: Equatable {
    static func == (lhs: KeychainError, rhs: KeychainError) -> Bool {
        switch (lhs, rhs) {
        case (.notFound, .notFound): return true
        case (.encodingError, .encodingError): return true
        case (.unexpectedStatus(let a), .unexpectedStatus(let b)): return a == b
        default: return false
        }
    }
}

// MARK: - Protocol for testability

protocol KeychainStoring {
    func save(_ value: String, forKey key: String) throws
    func load(forKey key: String) throws -> String
    func exists(forKey key: String) -> Bool
}

// MARK: - Default implementation backed by SecItem

struct DefaultKeychainStore: KeychainStoring {
    func save(_ value: String, forKey key: String) throws {
        try KeychainHelper.save(value, forKey: key)
    }
    func load(forKey key: String) throws -> String {
        try KeychainHelper.load(forKey: key)
    }
    func exists(forKey key: String) -> Bool {
        KeychainHelper.exists(forKey: key)
    }
}

// MARK: - Static helpers

struct KeychainHelper {

    static func save(_ value: String, forKey key: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.encodingError
        }
        let deleteQuery: [CFString: Any] = [
            kSecClass:       kSecClassGenericPassword,
            kSecAttrAccount: key,
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        let addQuery: [CFString: Any] = [
            kSecClass:          kSecClassGenericPassword,
            kSecAttrAccount:    key,
            kSecValueData:      data,
            kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlock,
        ]
        let status = SecItemAdd(addQuery as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    static func load(forKey key: String) throws -> String {
        let query: [CFString: Any] = [
            kSecClass:       kSecClassGenericPassword,
            kSecAttrAccount: key,
            kSecReturnData:  true,
            kSecMatchLimit:  kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess else {
            if status == errSecItemNotFound { throw KeychainError.notFound }
            throw KeychainError.unexpectedStatus(status)
        }
        guard let data = result as? Data,
              let string = String(data: data, encoding: .utf8) else {
            throw KeychainError.encodingError
        }
        return string
    }

    static func delete(forKey key: String) {
        let query: [CFString: Any] = [
            kSecClass:       kSecClassGenericPassword,
            kSecAttrAccount: key,
        ]
        SecItemDelete(query as CFDictionary)
    }

    static func exists(forKey key: String) -> Bool {
        (try? load(forKey: key)) != nil
    }
}

// MARK: - Key constants

extension KeychainHelper {
    static let apiTokenKey = "queens.api_token"
}
