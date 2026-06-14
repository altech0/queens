//
//  PuzzleFetcher.swift
//  queens
//
//  Created by Alex on 25/03/2026.
//

import Foundation
import os.log

/// API response format from the puzzle service (v2)
struct PuzzleAPIResponse: Codable {
    let id: String
    let code: Int?
    let size: Int
    let stars: Int?
    let regions: [[Int]]
    let solution: SolutionFormat
    let difficulty: String?
    let createdAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case code
        case size
        case gridSize
        case stars
        case regions
        case solution
        case difficulty
        case createdAt
    }
    
    // Support both v1 and v2 solution formats
    enum SolutionFormat: Codable, CustomStringConvertible {
        case singleArray([Int])      // v1: [col1, col2, col3, ...]
        case nestedArray([[Int]])    // v2: [[col1, col2], [col3, col4], ...]
        
        var description: String {
            switch self {
            case .singleArray(let array):
                return "v1 format: \(array)"
            case .nestedArray(let array):
                return "v2 format: \(array)"
            }
        }
        
        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            
            // Try nested array first (v2 format)
            if let nested = try? container.decode([[Int]].self) {
                self = .nestedArray(nested)
                return
            }
            
            // Try single array (v1 format)
            if let single = try? container.decode([Int].self) {
                self = .singleArray(single)
                return
            }
            
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: decoder.codingPath,
                    debugDescription: "Solution must be either [Int] or [[Int]]"
                )
            )
        }
        
        func encode(to encoder: Encoder) throws {
            var container = encoder.singleValueContainer()
            switch self {
            case .singleArray(let array):
                try container.encode(array)
            case .nestedArray(let array):
                try container.encode(array)
            }
        }
    }
    
    // Custom init to handle both "size" and "gridSize" keys
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        id = try container.decode(String.self, forKey: .id)
        code = try? container.decode(Int.self, forKey: .code)
        
        // Try "gridSize" first, then "size"
        if let gridSizeValue = try? container.decode(Int.self, forKey: .gridSize) {
            size = gridSizeValue
        } else if let sizeValue = try? container.decode(Int.self, forKey: .size) {
            size = sizeValue
        } else {
            throw DecodingError.keyNotFound(
                CodingKeys.size,
                DecodingError.Context(
                    codingPath: decoder.codingPath,
                    debugDescription: "Neither 'size' nor 'gridSize' key found"
                )
            )
        }
        
        stars = try? container.decode(Int.self, forKey: .stars)
        regions = try container.decode([[Int]].self, forKey: .regions)
        solution = try container.decode(SolutionFormat.self, forKey: .solution)
        difficulty = try? container.decode(String.self, forKey: .difficulty)
        createdAt = try container.decode(String.self, forKey: .createdAt)
    }
    
    // Custom encode to match the decoding
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(code, forKey: .code)
        try container.encode(size, forKey: .size)
        try container.encodeIfPresent(stars, forKey: .stars)
        try container.encode(regions, forKey: .regions)
        try container.encode(solution, forKey: .solution)
        try container.encodeIfPresent(difficulty, forKey: .difficulty)
        try container.encode(createdAt, forKey: .createdAt)
    }
    
    /// Convert API response to internal StarBattlePuzzle format
    func toPuzzle(starsPerRegion: Int) -> StarBattlePuzzle {
        var solutionSet = Set<GridPosition>()
        
        switch solution {
        case .singleArray(let columns):
            // v1 format: solution[row] = column (one star per row)
            for (row, column) in columns.enumerated() {
                solutionSet.insert(GridPosition(row: row, column: column))
            }
            
        case .nestedArray(let rowArrays):
            // v2 format: solution[row] = [col1, col2, ...] (multiple stars per row)
            for (row, columns) in rowArrays.enumerated() {
                for column in columns {
                    solutionSet.insert(GridPosition(row: row, column: column))
                }
            }
        }
        
        // Use stars from API if available, otherwise use parameter
        let starsCount = stars ?? starsPerRegion
        
        return StarBattlePuzzle(
            size: size,
            starsPerRegion: starsCount,
            regions: regions,
            solution: solutionSet,
            code: code.map { String($0) }  // Convert Int to String
        )
    }
}

/// Fetches puzzles from the backend API
class PuzzleFetcher {
    private static let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.app.queens", category: "PuzzleFetcher")
    
    /// Fetch a puzzle from the API using configuration
    static func fetchPuzzle(size: Int = 6, starsPerUnit: Int = 1) async throws -> StarBattlePuzzle {
        logger.info("🎯 Starting puzzle fetch process")

        // Get API configuration from Config.plist
        logger.debug("📝 Loading configuration...")
        let apiURLString: String
        let apiToken: String

        do {
            apiURLString = try Configuration.puzzleAPIURL
            apiToken = try KeychainHelper.load(forKey: KeychainHelper.apiTokenKey)
            logger.info("✅ Configuration loaded successfully")
        } catch {
            logger.error("❌ Failed to load configuration: \(error.localizedDescription)")
            throw error
        }

        // Build URL with query parameters
        guard var urlComponents = URLComponents(string: apiURLString) else {
            logger.error("❌ Invalid URL string: \(apiURLString)")
            throw PuzzleFetchError.invalidURL
        }

        // Add query parameters
        urlComponents.queryItems = [
            URLQueryItem(name: "size", value: "\(size)"),
            URLQueryItem(name: "stars", value: "\(starsPerUnit)")
        ]

        guard let url = urlComponents.url else {
            logger.error("❌ Failed to construct URL with query parameters")
            throw PuzzleFetchError.invalidURL
        }

        logger.info("🌐 Preparing request to: \(url.absoluteString)")
        logger.debug("📦 Query parameters: size=\(size), stars=\(starsPerUnit)")

        var request = URLRequest(url: url)
        request.setValue(apiToken, forHTTPHeaderField: "X-API-Token")
        request.httpMethod = "GET"
        request.timeoutInterval = 30

        logger.debug("📤 Request details:")
        logger.debug("  - URL: \(url.absoluteString)")
        logger.debug("  - Method: GET")
        logger.debug("  - Timeout: 30s")
        
        logger.info("⏳ Sending request...")
        
        let data: Data
        let response: URLResponse
        
        do {
            (data, response) = try await URLSession.shared.data(for: request)
            logger.info("✅ Received response (\(data.count) bytes)")
        } catch {
            logger.error("❌ Network request failed: \(error.localizedDescription)")
            
            // Check if this is a network connectivity issue
            let nsError = error as NSError
            if nsError.domain == NSURLErrorDomain {
                switch nsError.code {
                case NSURLErrorNotConnectedToInternet,
                     NSURLErrorNetworkConnectionLost,
                     NSURLErrorCannotConnectToHost,
                     NSURLErrorTimedOut,
                     NSURLErrorDNSLookupFailed:
                    logger.error("🔌 Network connectivity issue detected")
                    throw PuzzleFetchError.networkUnavailable
                default:
                    throw error
                }
            }
            throw error
        }
        
        guard let httpResponse = response as? HTTPURLResponse else {
            logger.error("❌ Response is not an HTTP response")
            throw PuzzleFetchError.invalidResponse
        }
        
        logger.debug("📥 HTTP Response:")
        logger.debug("  - Status code: \(httpResponse.statusCode)")
        logger.debug("  - Headers: \(httpResponse.allHeaderFields)")
        
        guard httpResponse.statusCode == 200 else {
            logger.error("❌ HTTP error - status code: \(httpResponse.statusCode)")

            if let responseString = String(data: data, encoding: .utf8) {
                logger.error("📄 Response body: \(responseString)")
            }

            if httpResponse.statusCode == 401 {
                handleUnauthenticated()
                throw PuzzleFetchError.unauthenticated
            }
            if httpResponse.statusCode == 429 {
                throw PuzzleFetchError.rateLimited
            }
            throw PuzzleFetchError.httpError(statusCode: httpResponse.statusCode)
        }

        logger.info("✅ HTTP 200 OK - decoding response...")

        if let jsonString = String(data: data, encoding: .utf8) {
            logger.debug("📄 Raw JSON response:")
            logger.debug("\(jsonString)")
        }

        let decoder = JSONDecoder()
        let apiResponse: PuzzleAPIResponse

        do {
            apiResponse = try decoder.decode(PuzzleAPIResponse.self, from: data)
            logger.info("✅ Successfully decoded API response")
            logger.debug("📋 API Response:")
            logger.debug("  - ID: \(apiResponse.id)")
            logger.debug("  - Size: \(apiResponse.size)")
            if let stars = apiResponse.stars {
                logger.debug("  - Stars: \(stars)")
            }
            logger.debug("  - Solution format: \(apiResponse.solution)")
        } catch {
            logger.error("❌ Failed to decode JSON: \(error.localizedDescription)")
            if let decodingError = error as? DecodingError {
                logger.error("📋 Decoding error details: \(decodingError)")
            }
            throw PuzzleFetchError.decodingError
        }

        // Convert to internal puzzle format
        logger.debug("🔄 Converting API format to internal format...")
        let puzzle = apiResponse.toPuzzle(starsPerRegion: starsPerUnit)
        
        logger.info("🎉 Puzzle fetched successfully!")
        logger.debug("📊 Puzzle details:")
        logger.debug("  - Size: \(puzzle.size)x\(puzzle.size)")
        logger.debug("  - Stars per region: \(puzzle.starsPerRegion)")
        logger.debug("  - Solution positions: \(puzzle.solution.count)")
        logger.debug("  - Solution: \(puzzle.solution)")
        
        return puzzle
    }
    
    /// Fetch a specific puzzle by code
    static func fetchSpecificPuzzle(code: String) async throws -> StarBattlePuzzle {
        logger.info("🎯 Fetching specific puzzle: \(code)")
        
        logger.debug("📝 Loading configuration...")
        let apiURLString: String
        let apiToken: String

        do {
            apiURLString = try Configuration.puzzleAPIURL
            apiToken = try KeychainHelper.load(forKey: KeychainHelper.apiTokenKey)
            logger.info("✅ Configuration loaded successfully")
        } catch {
            logger.error("❌ Failed to load configuration: \(error.localizedDescription)")
            throw error
        }

        guard let url = URL(string: "\(apiURLString)/\(code)") else {
            logger.error("❌ Failed to construct URL for code: \(code)")
            throw PuzzleFetchError.invalidURL
        }

        logger.info("🌐 Preparing request to: \(url.absoluteString)")

        var request = URLRequest(url: url)
        request.setValue(apiToken, forHTTPHeaderField: "X-API-Token")
        request.httpMethod = "GET"
        request.timeoutInterval = 30
        
        logger.info("⏳ Sending request...")
        
        let data: Data
        let response: URLResponse
        
        do {
            (data, response) = try await URLSession.shared.data(for: request)
            logger.info("✅ Received response (\(data.count) bytes)")
        } catch {
            logger.error("❌ Network request failed: \(error.localizedDescription)")
            
            // Check if this is a network connectivity issue
            let nsError = error as NSError
            if nsError.domain == NSURLErrorDomain {
                switch nsError.code {
                case NSURLErrorNotConnectedToInternet,
                     NSURLErrorNetworkConnectionLost,
                     NSURLErrorCannotConnectToHost,
                     NSURLErrorTimedOut,
                     NSURLErrorDNSLookupFailed:
                    logger.error("🔌 Network connectivity issue detected")
                    throw PuzzleFetchError.networkUnavailable
                default:
                    throw error
                }
            }
            throw error
        }
        
        guard let httpResponse = response as? HTTPURLResponse else {
            logger.error("❌ Response is not an HTTP response")
            throw PuzzleFetchError.invalidResponse
        }
        
        logger.debug("📥 HTTP Response:")
        logger.debug("  - Status code: \(httpResponse.statusCode)")
        
        guard httpResponse.statusCode == 200 else {
            logger.error("❌ HTTP error - status code: \(httpResponse.statusCode)")

            if let responseString = String(data: data, encoding: .utf8) {
                logger.error("📄 Response body: \(responseString)")
            }

            if httpResponse.statusCode == 401 {
                handleUnauthenticated()
                throw PuzzleFetchError.unauthenticated
            }
            if httpResponse.statusCode == 429 {
                throw PuzzleFetchError.rateLimited
            }
            throw PuzzleFetchError.httpError(statusCode: httpResponse.statusCode)
        }

        logger.info("✅ HTTP 200 OK - decoding response...")

        if let jsonString = String(data: data, encoding: .utf8) {
            logger.debug("📄 Raw JSON response:")
            logger.debug("\(jsonString)")
        }

        let decoder = JSONDecoder()
        let apiResponse: PuzzleAPIResponse

        do {
            apiResponse = try decoder.decode(PuzzleAPIResponse.self, from: data)
            logger.info("✅ Successfully decoded API response")
            logger.debug("📋 API Response:")
            logger.debug("  - ID: \(apiResponse.id)")
            logger.debug("  - Code: \(apiResponse.code ?? 0)")
            logger.debug("  - Size: \(apiResponse.size)")
            if let stars = apiResponse.stars {
                logger.debug("  - Stars: \(stars)")
            }
        } catch {
            logger.error("❌ Failed to decode JSON: \(error.localizedDescription)")
            if let decodingError = error as? DecodingError {
                logger.error("📋 Decoding error details: \(decodingError)")
            }
            throw PuzzleFetchError.decodingError
        }
        
        // Convert to internal puzzle format
        // Use stars from API response, or default to 1
        let starsPerRegion = apiResponse.stars ?? 1
        logger.debug("🔄 Converting API format to internal format...")
        let puzzle = apiResponse.toPuzzle(starsPerRegion: starsPerRegion)
        
        logger.info("🎉 Specific puzzle fetched successfully!")
        logger.debug("📊 Puzzle details:")
        logger.debug("  - Size: \(puzzle.size)x\(puzzle.size)")
        logger.debug("  - Stars per region: \(puzzle.starsPerRegion)")
        logger.debug("  - Solution positions: \(puzzle.solution.count)")
        
        return puzzle
    }
    
    /// Fetch a specific puzzle by code (for deep linking)
    static func fetchPuzzleByCode(_ code: String) async throws -> StarBattlePuzzle {
        logger.info("🔗 Fetching puzzle by code: \(code)")
        
        let apiURLString: String
        let apiToken: String

        do {
            apiURLString = try Configuration.puzzleAPIURL
            apiToken = try KeychainHelper.load(forKey: KeychainHelper.apiTokenKey)
        } catch {
            logger.error("❌ Failed to load configuration: \(error.localizedDescription)")
            throw error
        }

        guard var urlComponents = URLComponents(string: apiURLString + "/\(code)") else {
            throw PuzzleFetchError.invalidURL
        }

        guard let url = urlComponents.url else {
            throw PuzzleFetchError.invalidURL
        }

        var request = URLRequest(url: url)
        request.setValue(apiToken, forHTTPHeaderField: "X-API-Token")
        request.httpMethod = "GET"
        request.timeoutInterval = 30

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw PuzzleFetchError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            if httpResponse.statusCode == 401 {
                handleUnauthenticated()
                throw PuzzleFetchError.unauthenticated
            }
            if httpResponse.statusCode == 429 {
                throw PuzzleFetchError.rateLimited
            }
            throw PuzzleFetchError.httpError(statusCode: httpResponse.statusCode)
        }
        
        let apiResponse = try JSONDecoder().decode(PuzzleAPIResponse.self, from: data)
        let starsPerRegion = apiResponse.stars ?? 1
        let puzzle = apiResponse.toPuzzle(starsPerRegion: starsPerRegion)
        
        logger.info("✅ Puzzle loaded from code: \(code)")
        return puzzle
    }
    
    /// Handle unauthenticated error by clearing credentials and notifying app to re-register
    private static func handleUnauthenticated() {
        logger.warning("🔐 Clearing stored authentication credentials")
        
        // Clear the API token
        KeychainHelper.delete(forKey: KeychainHelper.apiTokenKey)
        
        // Post notification to trigger re-authentication flow
        NotificationCenter.default.post(name: .authenticationExpired, object: nil)
        
        logger.info("📢 Posted authenticationExpired notification")
    }
}

/// Errors that can occur when fetching puzzles
enum PuzzleFetchError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError
    case configurationError(String)
    case networkUnavailable
    case invalidRequest
    case unauthenticated
    case rateLimited

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode):
            return "Server error: \(statusCode)"
        case .decodingError:
            return "Failed to decode puzzle data"
        case .configurationError(let message):
            return "Configuration error: \(message)"
        case .networkUnavailable:
            return "Sorry, can't fetch a puzzle right now"
        case .invalidRequest:
            return "Failed to create request"
        case .unauthenticated:
            return "Authentication error. Please restart the app."
        case .rateLimited:
            return "Taking a breather — you've been busy! Try again in a minute."
        }
    }
}
