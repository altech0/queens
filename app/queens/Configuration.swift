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
        
        // Try to load from Config.plist (Config.debug.plist in Debug builds)
        #if DEBUG
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
}
