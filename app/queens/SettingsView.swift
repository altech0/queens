//
//  SettingsView.swift
//  queens
//
//  Created by Alex on 22/03/2026.
//

import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppSettings.self) private var settings
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.verticalSizeClass) private var verticalSizeClass
    
    private var isIPadLandscape: Bool {
        horizontalSizeClass == .regular && verticalSizeClass == .regular
    }
    
    var body: some View {
        ZStack {
            AppColors.backgroundGradient(colorScheme)
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header - hide on iPad landscape
                if !isIPadLandscape {
                    HStack {
                        Button(action: {
                            dismiss()
                        }) {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 20, weight: .medium))
                                .foregroundColor(AppColors.primary(colorScheme))
                                .frame(width: 44, height: 44)
                        }
                        
                        Spacer()
                        
                        Text("Settings")
                            .font(.system(size: 24, weight: .medium, design: .rounded))
                            .foregroundColor(AppColors.textPrimary(colorScheme))
                        
                        Spacer()
                        
                        // Invisible placeholder for symmetry
                        Color.clear
                            .frame(width: 44, height: 44)
                    }
                    .padding(.horizontal)
                    .padding(.top, 10)
                    .padding(.bottom, 20)
                }
                
                // Settings content
                VStack(spacing: 0) {
                    // Appearance section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Appearance")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundColor(AppColors.textSecondary(colorScheme))
                            .textCase(.uppercase)
                            .padding(.horizontal, 20)
                            .padding(.top, isIPadLandscape ? 10 : 20)

                        VStack(spacing: 0) {
                            Toggle(isOn: Binding(
                                get: { settings.darkMode },
                                set: { newValue in withAnimation(.easeInOut(duration: 0.35)) { settings.darkMode = newValue } }
                            )) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Dark Mode")
                                        .font(.system(size: 17, weight: .regular, design: .rounded))
                                        .foregroundColor(AppColors.textPrimary(colorScheme))

                                    Text("Switch to a dark colour scheme")
                                        .font(.system(size: 14, weight: .regular, design: .rounded))
                                        .foregroundColor(AppColors.textSecondary(colorScheme))
                                        .opacity(0.8)
                                }
                            }
                            .tint(AppColors.primary(colorScheme))
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(AppColors.surface(colorScheme))

                            Divider()
                                .padding(.leading, 20)

                            Toggle(isOn: Binding(
                                get: { settings.enhancedContrastMode },
                                set: { settings.enhancedContrastMode = $0 }
                            )) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Enhanced Contrast")
                                        .font(.system(size: 17, weight: .regular, design: .rounded))
                                        .foregroundColor(AppColors.textPrimary(colorScheme))

                                    Text("Use high-contrast colours for better region differentiation")
                                        .font(.system(size: 14, weight: .regular, design: .rounded))
                                        .foregroundColor(AppColors.textSecondary(colorScheme))
                                        .opacity(0.8)
                                }
                            }
                            .tint(AppColors.primary(colorScheme))
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(AppColors.surface(colorScheme))
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .frame(maxWidth: isIPadLandscape ? 600 : .infinity)
                        .padding(.horizontal, 16)
                    }
                    .frame(maxWidth: .infinity)
                    
                    // Gameplay section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Gameplay")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundColor(AppColors.textSecondary(colorScheme))
                            .textCase(.uppercase)
                            .padding(.horizontal, 20)
                            .padding(.top, 32)
                        
                        VStack(spacing: 0) {
                            Toggle(isOn: Binding(
                                get: { settings.hideTimer },
                                set: { settings.hideTimer = $0 }
                            )) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Hide Timer")
                                        .font(.system(size: 17, weight: .regular, design: .rounded))
                                        .foregroundColor(AppColors.textPrimary(colorScheme))
                                    
                                    Text("Hide the timer during gameplay for a more relaxed experience")
                                        .font(.system(size: 14, weight: .regular, design: .rounded))
                                        .foregroundColor(AppColors.textSecondary(colorScheme))
                                        .opacity(0.8)
                                }
                            }
                            .tint(AppColors.primary(colorScheme))
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(AppColors.surface(colorScheme))
                            
                            Divider()
                                .padding(.leading, 20)
                            
                            Toggle(isOn: Binding(
                                get: { settings.singleTapMode },
                                set: { settings.singleTapMode = $0 }
                            )) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Single Tap Mode")
                                        .font(.system(size: 17, weight: .regular, design: .rounded))
                                        .foregroundColor(AppColors.textPrimary(colorScheme))
                                    
                                    Text("Tap once to place star, tap again to remove (no X marks)")
                                        .font(.system(size: 14, weight: .regular, design: .rounded))
                                        .foregroundColor(AppColors.textSecondary(colorScheme))
                                        .opacity(0.8)
                                }
                            }
                            .tint(AppColors.primary(colorScheme))
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(AppColors.surface(colorScheme))
                            
                            Divider()
                                .padding(.leading, 20)
                            
                            Toggle(isOn: Binding(
                                get: { settings.showCompletionHints },
                                set: { settings.showCompletionHints = $0 }
                            )) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Show Completion Hints")
                                        .font(.system(size: 17, weight: .regular, design: .rounded))
                                        .foregroundColor(AppColors.textPrimary(colorScheme))

                                    Text("Show a reminder to check your progress when the grid appears complete")
                                        .font(.system(size: 14, weight: .regular, design: .rounded))
                                        .foregroundColor(AppColors.textSecondary(colorScheme))
                                        .opacity(0.8)
                                }
                            }
                            .tint(AppColors.primary(colorScheme))
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(AppColors.surface(colorScheme))

                            Divider()
                                .padding(.leading, 20)

                            Toggle(isOn: Binding(
                                get: { settings.highlightConflicts },
                                set: { settings.highlightConflicts = $0 }
                            )) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Highlight Conflicts")
                                        .font(.system(size: 17, weight: .regular, design: .rounded))
                                        .foregroundColor(AppColors.textPrimary(colorScheme))

                                    Text("Highlight stars that share a row, column, or are touching each other")
                                        .font(.system(size: 14, weight: .regular, design: .rounded))
                                        .foregroundColor(AppColors.textSecondary(colorScheme))
                                        .opacity(0.8)
                                }
                            }
                            .tint(AppColors.primary(colorScheme))
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(AppColors.surface(colorScheme))
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .frame(maxWidth: isIPadLandscape ? 600 : .infinity)
                        .padding(.horizontal, 16)
                    }
                    .frame(maxWidth: .infinity)
                    
                    Spacer()
                }
            }
        }
        .navigationBarHidden(!isIPadLandscape)
        .navigationTitle(isIPadLandscape ? "Settings" : "")
    }
}

#Preview {
    NavigationStack {
        SettingsView()
            .environment(AppSettings())
    }
}
