//
//  AppColors.swift
//  queens
//
//  Paired with: web/lib/colors.ts, web/app/globals.css, web/components/PuzzleGrid.tsx
//  When changing colours here, update those files too (and vice versa).
//

import SwiftUI

enum AppColors {

    // MARK: - Background gradient
    // globals.css: --bg-from/--bg-to
    // light: #f2f0fa → #e3edf7   dark: #1a2032 → #1e2840
    static func backgroundGradient(_ scheme: ColorScheme) -> LinearGradient {
        scheme == .dark
            ? LinearGradient(colors: [Color(hex: 0x1a2032), Color(hex: 0x1e2840)], startPoint: .topLeading, endPoint: .bottomTrailing)
            : LinearGradient(colors: [Color(hex: 0xf2f0fa), Color(hex: 0xe3edf7)], startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    // MARK: - Primary accent
    // globals.css: --primary / --primary-dark
    // light: #728bc0   dark: #9eb3e0
    static func primary(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0x9eb3e0) : Color(hex: 0x728bc0)
    }

    // light: #728bc0 → #5a73a8   dark: #9eb3e0 → #7a96cc
    static func primaryGradient(_ scheme: ColorScheme) -> LinearGradient {
        scheme == .dark
            ? LinearGradient(colors: [Color(hex: 0x9eb3e0), Color(hex: 0x7a96cc)], startPoint: .leading, endPoint: .trailing)
            : LinearGradient(colors: [Color(hex: 0x728bc0), Color(hex: 0x5a73a8)], startPoint: .leading, endPoint: .trailing)
    }

    // MARK: - Text
    // globals.css: --text-dark / --text-mid / --text-light
    // textPrimary  = --text-dark:  #4d5980 light / #c8d4f0 dark
    // textSecondary = --text-mid:  #808899 light / #7a8aaa dark
    // textDisabled  = --text-light: #a0a8b8 light / #4a5878 dark
    static func textPrimary(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0xc8d4f0) : Color(hex: 0x4d5980)
    }

    static func textSecondary(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0x7a8aaa) : Color(hex: 0x808899)
    }

    static func textDisabled(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0x4a5878) : Color(hex: 0xa0a8b8)
    }

    // MARK: - Surfaces
    // globals.css: --surface / --surface-low / --surface-mid / --surface-btn
    static func surface(_ scheme: ColorScheme) -> Color {
        // --surface: rgba(255,255,255,0.6) light / rgba(255,255,255,0.04) dark
        scheme == .dark ? Color(white: 1, opacity: 0.04) : Color(white: 1, opacity: 0.60)
    }

    static func surfaceLow(_ scheme: ColorScheme) -> Color {
        // --surface-low: rgba(255,255,255,0.2) light / rgba(255,255,255,0.06) dark
        scheme == .dark ? Color(white: 1, opacity: 0.06) : Color(white: 1, opacity: 0.20)
    }

    static func surfaceCard(_ scheme: ColorScheme) -> Color {
        // --surface-mid: rgba(255,255,255,0.55) light / rgba(255,255,255,0.06) dark
        scheme == .dark ? Color(white: 1, opacity: 0.06) : Color(white: 1, opacity: 0.55)
    }

    static func sidebarBackground(_ scheme: ColorScheme) -> Color {
        // --surface-mid (sidebar): same as surfaceCard
        scheme == .dark ? Color(white: 1, opacity: 0.06) : Color(white: 1, opacity: 0.55)
    }

    static func menuBackground(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0x1e2840) : Color.white
    }

    // MARK: - Grid
    static func gridBackground(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(white: 1, opacity: 0.06) : Color(white: 1, opacity: 0.55)
    }

    // X mark — PuzzleGrid.tsx: rgba(80,90,120,0.55) light / rgba(200,180,130,0.7) dark
    static func cellMark(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0xc8b482).opacity(0.7)
                        : Color(hex: 0x505a78).opacity(0.55)
    }

    // Star — PuzzleGrid.tsx: rgba(60,75,110,0.85) light / rgba(200,180,130,0.9) dark
    static func cellStar(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0xc8b482).opacity(0.9)
                        : Color(hex: 0x3c4b6e).opacity(0.85)
    }

    // Major region border — PuzzleGrid.tsx: rgba(100,110,140,0.5) light / rgba(180,160,120,0.9) dark, 1px
    static func regionBorder(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: 0xb4a078).opacity(0.9)
                        : Color(hex: 0x646e8c).opacity(0.5)
    }

    // Minor cell grid line — PuzzleGrid.tsx: rgba(180,185,200,0.4) light / rgba(255,255,255,0.06) dark, 1px
    static func cellMinorLine(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(white: 1, opacity: 0.06)
                        : Color(hex: 0xb4b9c8).opacity(0.4)
    }

    // MARK: - Region colour palettes
    // Source: web/lib/colors.ts — PASTEL / HIGH_CONTRAST / DARK arrays
    // Only 10 colours on web (cycled); iOS has 20 puzzles max so we extend the cycle.

    // PASTEL (light, standard)
    static let standardColors: [Color] = [
        Color(hex: 0xc8b4e8), // lavender
        Color(hex: 0xb4d4f0), // sky blue
        Color(hex: 0xb4e8c8), // mint
        Color(hex: 0xf0e0b4), // warm sand
        Color(hex: 0xf0b4c8), // rose
        Color(hex: 0xb4c8f0), // periwinkle
        Color(hex: 0xe8c8b4), // peach
        Color(hex: 0xc8e8b4), // light green
        Color(hex: 0xd4b4f0), // purple
        Color(hex: 0xb4f0e8), // aqua
    ]

    // DARK (dark, standard)
    static let standardColorsDark: [Color] = [
        Color(hex: 0x7a6898), // muted lavender
        Color(hex: 0x5a7898), // muted blue
        Color(hex: 0x5a8870), // muted mint
        Color(hex: 0x8c7848), // muted sand
        Color(hex: 0x8c5870), // muted rose
        Color(hex: 0x5a6898), // muted periwinkle
        Color(hex: 0x886048), // muted peach
        Color(hex: 0x6a8858), // muted green
        Color(hex: 0x6a5898), // muted purple
        Color(hex: 0x508880), // muted aqua
    ]

    // HIGH_CONTRAST (light, enhanced)
    static let enhancedColors: [Color] = [
        Color(hex: 0xa07fd4), // vivid lavender
        Color(hex: 0x5b9fd6), // vivid blue
        Color(hex: 0x5bbf8a), // vivid green
        Color(hex: 0xd4a83c), // vivid gold
        Color(hex: 0xd45b80), // vivid rose
        Color(hex: 0x5b7dd4), // vivid indigo
        Color(hex: 0xd47845), // vivid orange
        Color(hex: 0x7bbf5b), // vivid lime
        Color(hex: 0x9b5bd4), // vivid purple
        Color(hex: 0x5bbfb5), // vivid teal
    ]

    // HIGH_CONTRAST dark — no separate dark palette on web; use darkened versions
    static let enhancedColorsDark: [Color] = [
        Color(hex: 0x6b52a8), // dark lavender
        Color(hex: 0x3a72a8), // dark blue
        Color(hex: 0x3a8a5e), // dark green
        Color(hex: 0xa07828), // dark gold
        Color(hex: 0xa03858), // dark rose
        Color(hex: 0x3a52a8), // dark indigo
        Color(hex: 0xa05030), // dark orange
        Color(hex: 0x528a38), // dark lime
        Color(hex: 0x6a38a8), // dark purple
        Color(hex: 0x388a80), // dark teal
    ]

    static func regionColors(enhancedContrast: Bool, scheme: ColorScheme) -> [Color] {
        switch (enhancedContrast, scheme) {
        case (false, .light): return standardColors
        case (false, .dark):  return standardColorsDark
        case (true,  .light): return enhancedColors
        case (true,  .dark):  return enhancedColorsDark
        default:              return standardColors
        }
    }
}

// MARK: - Hex colour convenience
private extension Color {
    init(hex: UInt32) {
        self.init(
            red:   Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >>  8) & 0xff) / 255,
            blue:  Double( hex        & 0xff) / 255
        )
    }
}
