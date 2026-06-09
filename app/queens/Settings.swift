//
//  Settings.swift
//  queens
//
//  Created by Alex on 22/03/2026.
//

import SwiftUI

/// App-wide settings stored in UserDefaults
@Observable
class AppSettings {
    var enhancedContrastMode: Bool {
        get {
            guard UserDefaults.standard.object(forKey: "enhancedContrastMode") != nil else { return true }
            return UserDefaults.standard.bool(forKey: "enhancedContrastMode")
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "enhancedContrastMode")
        }
    }
    
    var hideTimer: Bool {
        get {
            UserDefaults.standard.bool(forKey: "hideTimer")
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "hideTimer")
        }
    }
    
    var sidebarOnLeft: Bool {
        get {
            UserDefaults.standard.bool(forKey: "sidebarOnLeft")
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "sidebarOnLeft")
        }
    }
    
    var singleTapMode: Bool {
        get {
            UserDefaults.standard.bool(forKey: "singleTapMode")
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "singleTapMode")
        }
    }
    
    var showCompletionHints: Bool {
        get {
            // Default to true if not set
            if UserDefaults.standard.object(forKey: "showCompletionHints") == nil {
                return true
            }
            return UserDefaults.standard.bool(forKey: "showCompletionHints")
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "showCompletionHints")
        }
    }

    var darkMode: Bool {
        get { UserDefaults.standard.bool(forKey: "darkMode") }
        set { UserDefaults.standard.set(newValue, forKey: "darkMode") }
    }

    var highlightConflicts: Bool {
        get {
            if UserDefaults.standard.object(forKey: "highlightConflicts") == nil {
                return true
            }
            return UserDefaults.standard.bool(forKey: "highlightConflicts")
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "highlightConflicts")
        }
    }
    
    var appLaunchCount: Int {
        get {
            UserDefaults.standard.integer(forKey: "appLaunchCount")
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "appLaunchCount")
        }
    }
    
    var isFirstLaunch: Bool {
        appLaunchCount == 0
    }
    
    func incrementLaunchCount() {
        appLaunchCount += 1
    }
}

/// Color palette for region backgrounds
enum RegionColorPalette {
    /// Assign colors to regions ensuring adjacent regions have different colors
    static func assignColors(for puzzle: StarBattlePuzzle, enhancedContrast: Bool, scheme: ColorScheme = .light) -> [Int: Color] {
        let allColors = AppColors.regionColors(enhancedContrast: enhancedContrast, scheme: scheme)
        
        // Find all unique region IDs
        let maxRegionId = puzzle.regions.flatMap { $0 }.max() ?? 0
        let regionCount = maxRegionId + 1
        
        // Build adjacency map: which regions touch each other?
        var adjacencies: [Int: Set<Int>] = [:]
        for regionId in 0...maxRegionId {
            adjacencies[regionId] = []
        }
        
        // Check each cell and its neighbors to find adjacent regions
        for row in 0..<puzzle.size {
            for col in 0..<puzzle.size {
                let currentRegion = puzzle.regions[row][col]
                
                // Check right neighbor
                if col < puzzle.size - 1 {
                    let rightRegion = puzzle.regions[row][col + 1]
                    if rightRegion != currentRegion {
                        adjacencies[currentRegion]?.insert(rightRegion)
                        adjacencies[rightRegion]?.insert(currentRegion)
                    }
                }
                
                // Check bottom neighbor
                if row < puzzle.size - 1 {
                    let bottomRegion = puzzle.regions[row + 1][col]
                    if bottomRegion != currentRegion {
                        adjacencies[currentRegion]?.insert(bottomRegion)
                        adjacencies[bottomRegion]?.insert(currentRegion)
                    }
                }
            }
        }
        
        // Greedy graph coloring: assign colors trying to maximize difference from neighbors
        var result: [Int: Color] = [:]
        
        // Sort regions by number of neighbors (most constrained first), then randomize within same constraint level
        let sortedRegions = (0...maxRegionId).shuffled().sorted { regionA, regionB in
            (adjacencies[regionA]?.count ?? 0) > (adjacencies[regionB]?.count ?? 0)
        }
        
        for regionId in sortedRegions {
            // Find which colors are already used by neighbors
            let neighborColors = adjacencies[regionId]?
                .compactMap { result[$0] } ?? []
            
            // Get available colors (not used by neighbors) and shuffle them for randomness
            let availableColors = allColors.filter { color in
                !neighborColors.contains(color)
            }.shuffled()
            
            // Pick a random available color
            if let selectedColor = availableColors.first {
                result[regionId] = selectedColor
            } else {
                // Fallback: if all colors are taken by neighbors, use a random color
                // (This shouldn't happen with 20 colors, but just in case)
                result[regionId] = allColors.randomElement() ?? allColors[0]
            }
        }
        
        return result
    }
    
}
