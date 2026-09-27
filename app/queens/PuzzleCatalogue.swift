//
//  PuzzleCatalogue.swift
//  queens
//
//  What puzzle styles the API has, and which sizes and difficulties actually
//  exist for each. Drives the style and size pickers so a new generator needs no
//  app release.
//

import Foundation
import os.log

// MARK: - Model

/// One size/stars combination of a style, with how many puzzles exist.
struct CatalogueSize: Codable, Hashable {
    let size: Int
    let stars: Int
    let count: Int
    /// Counts per difficulty bucket, so the picker can hide ones with no puzzles.
    let difficulties: [String: Int]

    /// Difficulty buckets that have at least one puzzle, in display order.
    var availableDifficulties: [String] {
        PuzzleConfig.allDifficulties.filter { (difficulties[$0] ?? 0) > 0 }
    }
}

/// One playable style, e.g. Original / Winding / Tangled.
struct CatalogueStyle: Codable, Hashable, Identifiable {
    /// Internal engine id, sent back as the `engine` query param.
    let engine: String
    let name: String
    let description: String
    let sizes: [CatalogueSize]

    var id: String { engine }

    var sizeOptions: [Int] { sizes.map(\.size) }

    func entry(forSize size: Int) -> CatalogueSize? {
        sizes.first { $0.size == size }
    }
}

struct PuzzleCatalogue: Codable, Hashable {
    let styles: [CatalogueStyle]

    var isEmpty: Bool { styles.isEmpty }

    func style(withEngine engine: String) -> CatalogueStyle? {
        styles.first { $0.engine == engine }
    }

    /// What the app offers when `/catalogue` is unavailable — an older API that
    /// has no such endpoint, or a network failure. Mirrors the pre-engines app:
    /// Original only, with the sizes and difficulties it used to hardcode.
    ///
    /// Counts are unknown here, so `count` is 1 purely to mark the combo as
    /// present; nothing displays it.
    static var fallback: PuzzleCatalogue {
        let sizes = PuzzleConfig.sizeOptions.map { size in
            CatalogueSize(
                size: size,
                stars: PuzzleConfig.starsForSize(size),
                count: 1,
                difficulties: Dictionary(
                    uniqueKeysWithValues: PuzzleConfig.validDifficulties(for: size).map { ($0, 1) }
                )
            )
        }
        return PuzzleCatalogue(styles: [
            CatalogueStyle(
                engine: PuzzleConfig.defaultEngine,
                name: "Original",
                description: "Balanced regions that grow evenly from the centre out.",
                sizes: sizes
            )
        ])
    }
}

// MARK: - Fetching

enum PuzzleCatalogueError: LocalizedError {
    case invalidURL
    case httpError(Int)
    case decodingError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:            return "Invalid catalogue URL"
        case .httpError(let code):   return "Catalogue request failed (\(code))"
        case .decodingError(let msg): return "Could not read catalogue: \(msg)"
        }
    }
}

/// Loads the catalogue, caches the last good response, and falls back to
/// Original-only when the endpoint is unavailable.
@Observable
final class PuzzleCatalogueStore {
    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.app.queens",
        category: "PuzzleCatalogue"
    )
    private static let cacheKey = "puzzleCatalogue"

    /// Always usable: the last good response, else the cached one, else fallback.
    private(set) var catalogue: PuzzleCatalogue
    /// True while a refresh is in flight, for the setup view's loading state.
    private(set) var isLoading = false
    /// True when showing the fallback rather than a real response.
    private(set) var isFallback: Bool

    init() {
        if let cached = Self.loadCached() {
            catalogue = cached
            isFallback = false
            Self.logger.info("📦 Loaded cached catalogue: \(cached.styles.count) styles")
        } else {
            catalogue = .fallback
            isFallback = true
            Self.logger.info("ℹ️ No cached catalogue — using Original-only fallback")
        }
    }

    /// Refreshes from the API. Never throws: on failure the existing catalogue
    /// (cached or fallback) stays in place, so the pickers always have something.
    @MainActor
    func refresh() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let fetched = try await Self.fetch()
            guard !fetched.isEmpty else {
                Self.logger.warning("⚠️ Catalogue came back empty — keeping current")
                return
            }
            catalogue = fetched
            isFallback = false
            Self.cache(fetched)
            Self.logger.info("✅ Catalogue refreshed: \(fetched.styles.map(\.engine).joined(separator: ", "))")
        } catch {
            // Expected against an API without /catalogue (e.g. prod before the
            // engines release), so this is not an error state for the user.
            Self.logger.warning("⚠️ Catalogue refresh failed (\(error.localizedDescription)) — keeping current")
        }
    }

    private static func fetch() async throws -> PuzzleCatalogue {
        let urlString = try Configuration.catalogueAPIURL
        let apiToken = try KeychainHelper.load(forKey: KeychainHelper.apiTokenKey)

        guard let url = URL(string: urlString) else { throw PuzzleCatalogueError.invalidURL }

        var request = URLRequest(url: url)
        request.setValue(apiToken, forHTTPHeaderField: "X-API-Token")
        request.httpMethod = "GET"
        request.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode != 200 {
            throw PuzzleCatalogueError.httpError(http.statusCode)
        }

        do {
            return try JSONDecoder().decode(PuzzleCatalogue.self, from: data)
        } catch {
            throw PuzzleCatalogueError.decodingError(error.localizedDescription)
        }
    }

    // MARK: Cache

    private static func loadCached() -> PuzzleCatalogue? {
        guard let data = UserDefaults.standard.data(forKey: cacheKey) else { return nil }
        do {
            return try JSONDecoder().decode(PuzzleCatalogue.self, from: data)
        } catch {
            // A shape change makes the old cache unreadable; drop it silently.
            logger.warning("⚠️ Could not decode cached catalogue: \(error.localizedDescription)")
            UserDefaults.standard.removeObject(forKey: cacheKey)
            return nil
        }
    }

    private static func cache(_ catalogue: PuzzleCatalogue) {
        do {
            UserDefaults.standard.set(try JSONEncoder().encode(catalogue), forKey: cacheKey)
        } catch {
            logger.warning("⚠️ Could not cache catalogue: \(error.localizedDescription)")
        }
    }
}
