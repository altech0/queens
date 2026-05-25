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
            UserDefaults.standard.bool(forKey: "enhancedContrastMode")
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
    /// Expanded pastel color palette (20 colors to choose from)
    static let allStandardColors: [Color] = [
        Color(red: 0.98, green: 0.92, blue: 0.96), // Soft pink
        Color(red: 0.92, green: 0.95, blue: 0.98), // Soft blue
        Color(red: 0.95, green: 0.98, blue: 0.92), // Soft green
        Color(red: 0.98, green: 0.96, blue: 0.92), // Soft peach
        Color(red: 0.96, green: 0.92, blue: 0.98), // Soft lavender
        Color(red: 0.98, green: 0.98, blue: 0.92), // Soft yellow
        Color(red: 0.92, green: 0.98, blue: 0.98), // Soft cyan
        Color(red: 0.98, green: 0.92, blue: 0.92), // Soft red
        Color(red: 0.95, green: 0.92, blue: 0.98), // Light purple
        Color(red: 0.92, green: 0.98, blue: 0.95), // Mint green
        Color(red: 0.98, green: 0.95, blue: 0.92), // Light coral
        Color(red: 0.92, green: 0.92, blue: 0.98), // Periwinkle
        Color(red: 0.98, green: 0.98, blue: 0.95), // Cream
        Color(red: 0.95, green: 0.98, blue: 0.98), // Ice blue
        Color(red: 0.98, green: 0.92, blue: 0.95), // Rose
        Color(red: 0.92, green: 0.95, blue: 0.92), // Sage
        Color(red: 0.98, green: 0.95, blue: 0.98), // Lilac
        Color(red: 0.95, green: 0.95, blue: 0.98), // Sky
        Color(red: 0.98, green: 0.98, blue: 0.92), // Butter
        Color(red: 0.95, green: 0.98, blue: 0.95)  // Honeydew
    ]
    
    /// Expanded enhanced contrast colors (20 colors to choose from)
    static let allEnhancedColors: [Color] = [
        Color(red: 0.95, green: 0.85, blue: 0.70), // Warm tan
        Color(red: 0.70, green: 0.85, blue: 0.95), // Cool blue
        Color(red: 0.95, green: 0.95, blue: 0.70), // Bright yellow
        Color(red: 0.85, green: 0.70, blue: 0.85), // Muted purple
        Color(red: 0.70, green: 0.90, blue: 0.75), // Seafoam green
        Color(red: 0.95, green: 0.75, blue: 0.70), // Coral
        Color(red: 0.75, green: 0.95, blue: 0.95), // Aqua
        Color(red: 0.95, green: 0.80, blue: 0.90), // Rose
        Color(red: 0.80, green: 0.95, blue: 0.70), // Lime
        Color(red: 0.90, green: 0.85, blue: 0.95), // Periwinkle
        Color(red: 0.95, green: 0.90, blue: 0.70), // Gold
        Color(red: 0.70, green: 0.80, blue: 0.95), // Sky blue
        Color(red: 0.95, green: 0.70, blue: 0.75), // Pink
        Color(red: 0.75, green: 0.95, blue: 0.70), // Light green
        Color(red: 0.90, green: 0.70, blue: 0.95), // Orchid
        Color(red: 0.70, green: 0.95, blue: 0.85), // Mint
        Color(red: 0.95, green: 0.85, blue: 0.85), // Blush
        Color(red: 0.85, green: 0.85, blue: 0.95), // Lavender
        Color(red: 0.85, green: 0.95, blue: 0.85), // Pale green
        Color(red: 0.95, green: 0.85, blue: 0.95)  // Light magenta
    ]
    
    /// Assign colors to regions ensuring adjacent regions have different colors
    static func assignColors(for puzzle: StarBattlePuzzle, enhancedContrast: Bool) -> [Int: Color] {
        let allColors = enhancedContrast ? allEnhancedColors : allStandardColors
        
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
    
    /// Get the appropriate color palette based on settings
    static func colors(enhancedContrast: Bool) -> [Color] {
        enhancedContrast ? allEnhancedColors : allStandardColors
    }
}
