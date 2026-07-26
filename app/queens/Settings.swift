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
    // darkMode needs a real stored property so @Observable can track changes and
    // .preferredColorScheme() at the root re-evaluates when it flips.
    var darkMode: Bool = UserDefaults.standard.bool(forKey: "darkMode") {
        didSet { UserDefaults.standard.set(darkMode, forKey: "darkMode") }
    }

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

    /// Selected difficulty filter for new games (raw values: easy/medium/hard/very_hard).
    /// Defaults to all. Persisted as a comma-joined string.
    var selectedDifficulties: Set<String> {
        get {
            guard let raw = UserDefaults.standard.string(forKey: "selectedDifficulties"), !raw.isEmpty else {
                return Set(PuzzleConfig.allDifficulties)
            }
            return Set(raw.split(separator: ",").map(String.init))
        }
        set {
            UserDefaults.standard.set(newValue.joined(separator: ","), forKey: "selectedDifficulties")
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
    /// Assign colours by region ID modulo palette length — matches web/lib/colors.ts regionColor()
    static func assignColors(for puzzle: StarBattlePuzzle, enhancedContrast: Bool, scheme: ColorScheme = .light) -> [Int: Color] {
        let palette = AppColors.regionColors(enhancedContrast: enhancedContrast, scheme: scheme)
        let maxRegionId = puzzle.regions.flatMap { $0 }.max() ?? 0
        var result: [Int: Color] = [:]
        for regionId in 0...maxRegionId {
            result[regionId] = palette[regionId % palette.count]
        }
        return result
    }
    
}
