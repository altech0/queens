//
//  Configuration.swift
//  queens
//
//  Created by Alex on 25/03/2026.
//

import Foundation
import os.log

enum Configuration {
    enum Error: Swift.Error {
        case missingKey
        case invalidValue
        case configFileNotFound
        case configFileInvalid
    }
    
    private static let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.app.queens", category: "Configuration")
    
    static func value<T>(for key: String) throws -> T where T: LosslessStringConvertible {
        logger.info("🔍 Looking for configuration key: \(key)")
        
        // First try Info.plist
        if let object = Bundle.main.object(forInfoDictionaryKey: key) {
            logger.debug("✅ Found key '\(key)' in Info.plist")
            
            switch object {
            case let value as T:
                logger.info("✅ Successfully loaded '\(key)' from Info.plist")
                return value
            case let string as String:
                guard let value = T(string) else {
                    logger.error("❌ Failed to convert value for key '\(key)' from Info.plist")
                    throw Error.invalidValue
                }
                logger.info("✅ Successfully loaded '\(key)' from Info.plist (converted)")
                return value
            default:
                logger.error("❌ Invalid value type for key '\(key)' in Info.plist")
                throw Error.invalidValue
            }
        }
        
        // Which Config plist to read.
        //
        // Debug builds use Config.debug.plist (dev API). A Beta build — the
        // TestFlight build that points at dev — is a Release build, so #if DEBUG
        // cannot distinguish it; it sets BETA_BUILD instead and reads
        // Config.beta.plist. Release falls through to Config.plist (prod).
        //
        // Ordering matters: BETA_BUILD is checked first so a Beta build can never
        // silently pick up the prod config.
        #if BETA_BUILD
        let configName = "Config.beta"
        #elseif DEBUG
        let configName = "Config.debug"
        #else
        let configName = "Config"
        #endif
        logger.debug("ℹ️ Key '\(key)' not found in Info.plist, trying \(configName).plist")

        guard let path = Bundle.main.path(forResource: configName, ofType: "plist") else {
            logger.error("❌ Config.plist file not found in bundle")
            logger.error("💡 Make sure Config.plist is added to your Xcode project and included in 'Copy Bundle Resources'")
            throw Error.configFileNotFound
        }
        
        logger.debug("✅ Found Config.plist at path: \(path)")
        
        guard let config = NSDictionary(contentsOfFile: path) else {
            logger.error("❌ Failed to load Config.plist - file may be corrupted or invalid XML")
            throw Error.configFileInvalid
        }
        
        logger.debug("✅ Successfully loaded Config.plist dictionary with \(config.count) keys")
        logger.debug("📋 Available keys in Config.plist: \(config.allKeys)")
        
        guard let value = config[key] as? T else {
            logger.error("❌ Key '\(key)' not found or has wrong type in Config.plist")
            logger.error("💡 Available keys: \(config.allKeys)")
            throw Error.missingKey
        }
        
        logger.info("✅ Successfully loaded '\(key)' from Config.plist")
        return value
    }
}

// MARK: - Convenience accessors
extension Configuration {
    static var puzzleAPIURL: String {
        get throws {
            logger.info("🌐 Requesting Puzzle API URL")
            let url: String = try Configuration.value(for: "PUZZLE_API_URL")
            logger.info("🌐 API URL: \(url)")
            return url
        }
    }

    /// `/catalogue`, derived from the puzzle URL so there is one host to configure.
    static var catalogueAPIURL: String {
        get throws {
            let puzzleURL = try puzzleAPIURL
            guard let url = URL(string: puzzleURL) else { throw Error.invalidValue }
            return url.deletingLastPathComponent()
                .appendingPathComponent("catalogue")
                .absoluteString
        }
    }

    /// True when the configured API is a dev host, for the "DEV" badge on Beta builds.
    static var isDevAPI: Bool {
        (try? puzzleAPIURL)?.contains(".dev.") ?? false
    }
}
