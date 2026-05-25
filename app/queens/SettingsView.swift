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
    @Environment(AuthManager.self) private var authManager
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.verticalSizeClass) private var verticalSizeClass
    
    @State private var showDeleteConfirmation = false
    @State private var isDeletingAccount = false
    @State private var deleteErrorMessage: String?
    @State private var showDeleteError = false
    
    private var isIPadLandscape: Bool {
        horizontalSizeClass == .regular && verticalSizeClass == .regular
    }
    
    var body: some View {
        ZStack {
            // Matching gradient background
            LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.94, blue: 0.98),
                    Color(red: 0.89, green: 0.93, blue: 0.97)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
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
                                .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                                .frame(width: 44, height: 44)
                        }
                        
                        Spacer()
                        
                        Text("Settings")
                            .font(.system(size: 24, weight: .medium, design: .rounded))
                            .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                        
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
                    // Accessibility section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Accessibility")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                            .textCase(.uppercase)
                            .padding(.horizontal, 20)
                            .padding(.top, isIPadLandscape ? 10 : 20)
                        
                        VStack(spacing: 0) {
                            Toggle(isOn: Binding(
                                get: { settings.enhancedContrastMode },
                                set: { settings.enhancedContrastMode = $0 }
                            )) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Enhanced Contrast")
                                        .font(.system(size: 17, weight: .regular, design: .rounded))
                                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                                    
                                    Text("Use high-contrast colors for better region differentiation")
                                        .font(.system(size: 14, weight: .regular, design: .rounded))
                                        .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                                        .opacity(0.8)
                                }
                            }
                            .tint(Color(red: 0.4, green: 0.5, blue: 0.7))
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(Color.white.opacity(0.5))
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
                            .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
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
                                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                                    
                                    Text("Hide the timer during gameplay for a more relaxed experience")
                                        .font(.system(size: 14, weight: .regular, design: .rounded))
                                        .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                                        .opacity(0.8)
                                }
                            }
                            .tint(Color(red: 0.4, green: 0.5, blue: 0.7))
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(Color.white.opacity(0.5))
                            
                            Divider()
                                .padding(.leading, 20)
                            
                            Toggle(isOn: Binding(
                                get: { settings.singleTapMode },
                                set: { settings.singleTapMode = $0 }
                            )) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Single Tap Mode")
                                        .font(.system(size: 17, weight: .regular, design: .rounded))
                                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                                    
                                    Text("Tap once to place star, tap again to remove (no X marks)")
                                        .font(.system(size: 14, weight: .regular, design: .rounded))
                                        .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                                        .opacity(0.8)
                                }
                            }
                            .tint(Color(red: 0.4, green: 0.5, blue: 0.7))
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(Color.white.opacity(0.5))
                            
                            Divider()
                                .padding(.leading, 20)
                            
                            Toggle(isOn: Binding(
                                get: { settings.showCompletionHints },
                                set: { settings.showCompletionHints = $0 }
                            )) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Show Completion Hints")
                                        .font(.system(size: 17, weight: .regular, design: .rounded))
                                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                                    
                                    Text("Show a reminder to check your progress when the grid appears complete")
                                        .font(.system(size: 14, weight: .regular, design: .rounded))
                                        .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                                        .opacity(0.8)
                                }
                            }
                            .tint(Color(red: 0.4, green: 0.5, blue: 0.7))
                            .padding(.horizontal, 20)
                            .padding(.vertical, 16)
                            .background(Color.white.opacity(0.5))
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .frame(maxWidth: isIPadLandscape ? 600 : .infinity)
                        .padding(.horizontal, 16)
                    }
                    .frame(maxWidth: .infinity)
                    
                    // Offline section
                    
                    // Account section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Account")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                            .textCase(.uppercase)
                            .padding(.horizontal, 20)
                            .padding(.top, 32)
                        
                        VStack(spacing: 0) {
                            Button(action: {
                                showDeleteConfirmation = true
                            }) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Delete Account")
                                            .font(.system(size: 17, weight: .regular, design: .rounded))
                                            .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                                        
                                        Text("Permanently delete your nickname and account")
                                            .font(.system(size: 14, weight: .regular, design: .rounded))
                                            .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                                            .opacity(0.8)
                                    }
                                    
                                    Spacer()
                                    
                                    if isDeletingAccount {
                                        ProgressView()
                                            .scaleEffect(0.9)
                                    }
                                }
                                .padding(.horizontal, 20)
                                .padding(.vertical, 16)
                                .background(Color.white.opacity(0.5))
                            }
                            .disabled(isDeletingAccount)
                            .buttonStyle(PlainButtonStyle())
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
        .alert("Delete Account?", isPresented: $showDeleteConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                Task {
                    await deleteAccount()
                }
            }
        } message: {
            Text("Your nickname and account will be permanently deleted. This action cannot be undone.")
        }
        .alert("Error", isPresented: $showDeleteError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(deleteErrorMessage ?? "Failed to delete account. Please try again.")
        }
        .navigationBarHidden(!isIPadLandscape)
        .navigationTitle(isIPadLandscape ? "Settings" : "")
    }
    
    // MARK: - Delete Account
    
    private func deleteAccount() async {
        isDeletingAccount = true
        
        do {
            try await authManager.deleteAccount()
            // AuthManager will handle setting state to .needsRegistration
            // which will automatically navigate to registration screen
        } catch {
            deleteErrorMessage = "Failed to delete account. Please try again."
            showDeleteError = true
            isDeletingAccount = false
        }
    }
}

#Preview {
    NavigationStack {
        SettingsView()
            .environment(AppSettings())
    }
}
