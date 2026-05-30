//
//  PuzzleCache.swift
//  queens
//
//  Created by Alex on 18/04/2026.
//

import Foundation
import os.log

/// A cached puzzle with metadata for display
struct CachedPuzzle: Codable, Identifiable {
    let id: String  // Unique identifier for the puzzle
    let puzzle: StarBattlePuzzle
    let addedDate: Date
    var completionTime: TimeInterval?  // Best completion time
    
    /// Display name for the puzzle
    var displayName: String {
        "\(puzzle.size)×\(puzzle.size) - \(puzzle.starsPerRegion) star\(puzzle.starsPerRegion > 1 ? "s" : "")"
    }
}

/// Manages the offline puzzle cache using UserDefaults
@Observable
class PuzzleCache {
    private static let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.app.queens", category: "PuzzleCache")
    private static let cacheKey = "cachedPuzzles"
    private static let maxCacheSize = 30
    
    private(set) var puzzles: [CachedPuzzle] = []
    
    init() {
        loadCache()
    }
    
    /// Load cached puzzles from UserDefaults
    private func loadCache() {
        Self.logger.info("📦 Loading puzzle cache...")
        
        guard let data = UserDefaults.standard.data(forKey: Self.cacheKey) else {
            Self.logger.info("ℹ️ No cached puzzles found")
            self.puzzles = []
            return
        }
        
        do {
            let decoder = JSONDecoder()
            self.puzzles = try decoder.decode([CachedPuzzle].self, from: data)
            Self.logger.info("✅ Loaded \(self.puzzles.count) cached puzzles")
        } catch {
            Self.logger.error("❌ Failed to decode cache: \(error.localizedDescription)")
            self.puzzles = []
        }
    }
    
    /// Save cached puzzles to UserDefaults
    private func saveCache() {
        Self.logger.info("💾 Saving puzzle cache...")
        
        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(self.puzzles)
            UserDefaults.standard.set(data, forKey: Self.cacheKey)
            Self.logger.info("✅ Saved \(self.puzzles.count) puzzles to cache")
        } catch {
            Self.logger.error("❌ Failed to encode cache: \(error.localizedDescription)")
        }
    }
    
    /// Add a puzzle to the cache
    func add(_ puzzle: StarBattlePuzzle) -> Bool {
        // Check if puzzle already exists (by puzzle code or solution set)
        if contains(puzzle) {
            Self.logger.warning("⚠️ Puzzle already in cache")
            return false
        }
        
        // Check cache size limit
        if puzzles.count >= Self.maxCacheSize {
            Self.logger.warning("⚠️ Cache is full (max: \(Self.maxCacheSize))")
            return false
        }
        
        // Create cached puzzle with unique ID
        let id = puzzle.code ?? UUID().uuidString
        let cached = CachedPuzzle(
            id: id,
            puzzle: puzzle,
            addedDate: Date()
        )
        
        puzzles.append(cached)
        saveCache()
        
        Self.logger.info("✅ Added puzzle to cache (total: \(self.puzzles.count))")
        return true
    }
    
    /// Remove a puzzle from the cache
    func remove(_ cachedPuzzle: CachedPuzzle) {
        self.puzzles.removeAll { $0.id == cachedPuzzle.id }
        saveCache()
        Self.logger.info("✅ Removed puzzle from cache (remaining: \(self.puzzles.count))")
    }
    
    /// Check if a puzzle is already in the cache
    func contains(_ puzzle: StarBattlePuzzle) -> Bool {
        // First check by puzzle code
        if let code = puzzle.code {
            if self.puzzles.contains(where: { $0.puzzle.code == code }) {
                return true
            }
        }
        
        // Then check by solution set (in case codes are different but puzzles are identical)
        return self.puzzles.contains { cached in
            cached.puzzle.size == puzzle.size &&
            cached.puzzle.starsPerRegion == puzzle.starsPerRegion &&
            cached.puzzle.solution == puzzle.solution &&
            cached.puzzle.regions == puzzle.regions
        }
    }
    
    var isFull: Bool {
        puzzles.count >= Self.maxCacheSize
    }

    /// Get the number of cached puzzles for a specific size/stars configuration
    func count(size: Int, stars: Int) -> Int {
        self.puzzles.filter { $0.puzzle.size == size && $0.puzzle.starsPerRegion == stars }.count
    }
    
    /// Update puzzle completion stats
    func updateCompletion(puzzleID: String, time: TimeInterval) {
        guard let index = self.puzzles.firstIndex(where: { $0.id == puzzleID }) else {
            Self.logger.warning("⚠️ Puzzle not found in cache: \(puzzleID)")
            return
        }
        
        // Only update if it's a better time (or first completion)
        if puzzles[index].completionTime == nil || time < puzzles[index].completionTime! {
            puzzles[index].completionTime = time
            saveCache()
            Self.logger.info("✅ Updated completion for puzzle \(puzzleID): \(time)s")
        }
    }
    
    /// Clear all cached puzzles
    func clearAll() {
        puzzles.removeAll()
        saveCache()
        Self.logger.info("🗑️ Cleared all cached puzzles")
    }
}
