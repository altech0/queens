//
//  AppColors.swift
//  queens
//

import SwiftUI

enum AppColors {
    // MARK: - Background gradient
    static func backgroundGradient(_ scheme: ColorScheme) -> LinearGradient {
        scheme == .dark
            ? LinearGradient(colors: [Color(red: 0.12, green: 0.15, blue: 0.22), Color(red: 0.14, green: 0.18, blue: 0.27)], startPoint: .topLeading, endPoint: .bottomTrailing)
            : LinearGradient(colors: [Color(red: 0.95, green: 0.94, blue: 0.98), Color(red: 0.89, green: 0.93, blue: 0.97)], startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    // MARK: - Primary accent (buttons, icons, links)
    static func primary(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(red: 0.62, green: 0.72, blue: 0.90) : Color(red: 0.40, green: 0.50, blue: 0.70)
    }

    static func primaryGradient(_ scheme: ColorScheme) -> LinearGradient {
        scheme == .dark
            ? LinearGradient(colors: [Color(red: 0.55, green: 0.66, blue: 0.88), Color(red: 0.62, green: 0.72, blue: 0.90)], startPoint: .leading, endPoint: .trailing)
            : LinearGradient(colors: [Color(red: 0.45, green: 0.55, blue: 0.75), Color(red: 0.50, green: 0.60, blue: 0.80)], startPoint: .leading, endPoint: .trailing)
    }

    // MARK: - Text
    static func textPrimary(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(red: 0.88, green: 0.91, blue: 0.97) : Color(red: 0.30, green: 0.35, blue: 0.50)
    }

    static func textSecondary(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(red: 0.62, green: 0.68, blue: 0.80) : Color(red: 0.50, green: 0.55, blue: 0.65)
    }

    static func textDisabled(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(red: 0.45, green: 0.48, blue: 0.56) : Color(red: 0.60, green: 0.62, blue: 0.68)
    }

    // MARK: - Surfaces
    static func surface(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(white: 1, opacity: 0.06) : Color(white: 1, opacity: 0.50)
    }

    static func surfaceLow(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(white: 1, opacity: 0.04) : Color(white: 1, opacity: 0.30)
    }

    static func surfaceCard(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(white: 1, opacity: 0.08) : Color.white.opacity(0.90)
    }

    static func sidebarBackground(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(white: 1, opacity: 0.05) : Color(white: 1, opacity: 0.40)
    }

    static func menuBackground(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(red: 0.18, green: 0.22, blue: 0.30) : Color.white
    }

    // MARK: - Grid
    static func gridBackground(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(white: 1, opacity: 0.08) : Color(white: 1, opacity: 0.50)
    }

    // X mark icon — warm gold in dark mode to match web (rgba(200,180,130,0.7))
    static func cellMark(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(red: 0.78, green: 0.71, blue: 0.51) : Color(red: 0.60, green: 0.62, blue: 0.68)
    }

    static func regionBorder(_ scheme: ColorScheme) -> Color {
        // Dark: warm gold matching the web (rgba(180,160,120,0.9))
        scheme == .dark ? Color(red: 0.71, green: 0.63, blue: 0.47) : Color(red: 0.50, green: 0.55, blue: 0.65)
    }

    static func cellGridLine(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(red: 0.40, green: 0.42, blue: 0.46) : Color(red: 0.25, green: 0.27, blue: 0.29)
    }

    // MARK: - Region colour palettes
    static let standardColors: [Color] = [
        Color(red: 0.98, green: 0.92, blue: 0.96),
        Color(red: 0.92, green: 0.95, blue: 0.98),
        Color(red: 0.95, green: 0.98, blue: 0.92),
        Color(red: 0.98, green: 0.96, blue: 0.92),
        Color(red: 0.96, green: 0.92, blue: 0.98),
        Color(red: 0.98, green: 0.98, blue: 0.92),
        Color(red: 0.92, green: 0.98, blue: 0.98),
        Color(red: 0.98, green: 0.92, blue: 0.92),
        Color(red: 0.95, green: 0.92, blue: 0.98),
        Color(red: 0.92, green: 0.98, blue: 0.95),
        Color(red: 0.98, green: 0.95, blue: 0.92),
        Color(red: 0.92, green: 0.92, blue: 0.98),
        Color(red: 0.98, green: 0.98, blue: 0.95),
        Color(red: 0.95, green: 0.98, blue: 0.98),
        Color(red: 0.98, green: 0.92, blue: 0.95),
        Color(red: 0.92, green: 0.95, blue: 0.92),
        Color(red: 0.98, green: 0.95, blue: 0.98),
        Color(red: 0.95, green: 0.95, blue: 0.98),
        Color(red: 0.98, green: 0.98, blue: 0.92),
        Color(red: 0.95, green: 0.98, blue: 0.95),
    ]

    static let standardColorsDark: [Color] = [
        Color(red: 0.42, green: 0.26, blue: 0.36),
        Color(red: 0.26, green: 0.32, blue: 0.46),
        Color(red: 0.28, green: 0.40, blue: 0.26),
        Color(red: 0.44, green: 0.34, blue: 0.22),
        Color(red: 0.34, green: 0.26, blue: 0.46),
        Color(red: 0.40, green: 0.40, blue: 0.22),
        Color(red: 0.24, green: 0.40, blue: 0.40),
        Color(red: 0.44, green: 0.24, blue: 0.24),
        Color(red: 0.36, green: 0.26, blue: 0.46),
        Color(red: 0.24, green: 0.38, blue: 0.32),
        Color(red: 0.44, green: 0.32, blue: 0.22),
        Color(red: 0.24, green: 0.26, blue: 0.46),
        Color(red: 0.40, green: 0.40, blue: 0.28),
        Color(red: 0.28, green: 0.40, blue: 0.40),
        Color(red: 0.44, green: 0.24, blue: 0.34),
        Color(red: 0.24, green: 0.34, blue: 0.24),
        Color(red: 0.40, green: 0.28, blue: 0.40),
        Color(red: 0.30, green: 0.30, blue: 0.46),
        Color(red: 0.40, green: 0.40, blue: 0.24),
        Color(red: 0.28, green: 0.40, blue: 0.28),
    ]

    static let enhancedColors: [Color] = [
        Color(red: 0.95, green: 0.85, blue: 0.70),
        Color(red: 0.70, green: 0.85, blue: 0.95),
        Color(red: 0.95, green: 0.95, blue: 0.70),
        Color(red: 0.85, green: 0.70, blue: 0.85),
        Color(red: 0.70, green: 0.90, blue: 0.75),
        Color(red: 0.95, green: 0.75, blue: 0.70),
        Color(red: 0.75, green: 0.95, blue: 0.95),
        Color(red: 0.95, green: 0.80, blue: 0.90),
        Color(red: 0.80, green: 0.95, blue: 0.70),
        Color(red: 0.90, green: 0.85, blue: 0.95),
        Color(red: 0.95, green: 0.90, blue: 0.70),
        Color(red: 0.70, green: 0.80, blue: 0.95),
        Color(red: 0.95, green: 0.70, blue: 0.75),
        Color(red: 0.75, green: 0.95, blue: 0.70),
        Color(red: 0.90, green: 0.70, blue: 0.95),
        Color(red: 0.70, green: 0.95, blue: 0.85),
        Color(red: 0.95, green: 0.85, blue: 0.85),
        Color(red: 0.85, green: 0.85, blue: 0.95),
        Color(red: 0.85, green: 0.95, blue: 0.85),
        Color(red: 0.95, green: 0.85, blue: 0.95),
    ]

    static let enhancedColorsDark: [Color] = [
        Color(red: 0.52, green: 0.38, blue: 0.18),
        Color(red: 0.18, green: 0.38, blue: 0.52),
        Color(red: 0.50, green: 0.50, blue: 0.14),
        Color(red: 0.42, green: 0.18, blue: 0.42),
        Color(red: 0.18, green: 0.46, blue: 0.22),
        Color(red: 0.52, green: 0.24, blue: 0.18),
        Color(red: 0.20, green: 0.50, blue: 0.50),
        Color(red: 0.50, green: 0.28, blue: 0.42),
        Color(red: 0.28, green: 0.50, blue: 0.18),
        Color(red: 0.44, green: 0.36, blue: 0.52),
        Color(red: 0.50, green: 0.42, blue: 0.14),
        Color(red: 0.18, green: 0.28, blue: 0.52),
        Color(red: 0.52, green: 0.18, blue: 0.22),
        Color(red: 0.22, green: 0.52, blue: 0.18),
        Color(red: 0.44, green: 0.18, blue: 0.52),
        Color(red: 0.18, green: 0.50, blue: 0.36),
        Color(red: 0.52, green: 0.34, blue: 0.34),
        Color(red: 0.34, green: 0.34, blue: 0.52),
        Color(red: 0.34, green: 0.52, blue: 0.34),
        Color(red: 0.52, green: 0.34, blue: 0.52),
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
