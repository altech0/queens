//
//  ContentView.swift
//  queens
//
//  Created by Alex on 22/03/2026.
//

import SwiftUI

enum NavDestination: Hashable {
    case gameSetup
    case specificPuzzle
    case offline
    case settings
    case howToPlay
    case about
    case deepLink(String)
}

struct ContentView: View {
    @State private var navPath = NavigationPath()
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        NavigationStack(path: $navPath) {
            ZStack {
                AppColors.backgroundGradient(colorScheme)
                    .ignoresSafeArea()
                
                VStack(spacing: 0) {
                Spacer()
                
                // Title
                VStack(spacing: 12) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(AppColors.primaryGradient(colorScheme))
                        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
                    
                    Text("Queens")
                        .font(.system(size: 48, weight: .light, design: .rounded))
                        .foregroundColor(AppColors.textPrimary(colorScheme))
                    
                }
                
                Spacer()
                
                // Buttons section
                VStack(spacing: 16) {
                    // New Game Button
                    Button(action: {
                        navPath.append(NavDestination.gameSetup)
                    }) {
                        Text("New Game")
                            .font(.system(size: 22, weight: .medium, design: .rounded))
                            .foregroundColor(.white)
                            .padding(.vertical, 18)
                            .frame(maxWidth: 280)
                            .background(AppColors.primaryGradient(colorScheme))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .shadow(color: AppColors.primary(colorScheme).opacity(0.3), radius: 15, x: 0, y: 8)
                    }
                    
                    // Row with Specific Puzzle and Offline buttons
                    HStack(spacing: 12) {
                        // Specific Puzzle Button
                        Button(action: {
                            navPath.append(NavDestination.specificPuzzle)
                        }) {
                            Text("Specific Puzzle")
                                .font(.system(size: 16, weight: .medium, design: .rounded))
                                .foregroundColor(AppColors.primary(colorScheme))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(AppColors.primary(colorScheme), lineWidth: 2)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(AppColors.surfaceLow(colorScheme))
                                        )
                                )
                        }
                        
                        // Offline Button
                        Button(action: {
                            navPath.append(NavDestination.offline)
                        }) {
                            Text("Offline")
                                .font(.system(size: 16, weight: .medium, design: .rounded))
                                .foregroundColor(AppColors.primary(colorScheme))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(AppColors.primary(colorScheme), lineWidth: 2)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(AppColors.surfaceLow(colorScheme))
                                        )
                                )
                        }
                    }
                    .frame(maxWidth: 280)
                }
                
                Spacer()
                
                // Bottom icon buttons
                HStack(spacing: 60) {
                    // How to Play
                    Button(action: {
                        navPath.append(NavDestination.howToPlay)
                    }) {
                        Image(systemName: "questionmark.circle")
                            .font(.system(size: 32, weight: .regular))
                            .foregroundColor(AppColors.primary(colorScheme))
                    }
                    
                    // Settings
                    Button(action: {
                        navPath.append(NavDestination.settings)
                    }) {
                        Image(systemName: "gearshape")
                            .font(.system(size: 32, weight: .regular))
                            .foregroundColor(AppColors.primary(colorScheme))
                    }
                    
                    // About
                    Button(action: {
                        navPath.append(NavDestination.about)
                    }) {
                        Image(systemName: "info.circle")
                            .font(.system(size: 32, weight: .regular))
                            .foregroundColor(AppColors.primary(colorScheme))
                    }
                }
                .padding(.bottom, 40)
                }
                .padding()
                .onReceive(NotificationCenter.default.publisher(for: .openPuzzle)) { notification in
                    if let code = notification.userInfo?["code"] as? String {
                        navPath.append(NavDestination.deepLink(code))
                    }
                }
            }
            .navigationDestination(for: NavDestination.self) { dest in
                switch dest {
                case .gameSetup:     GameSetupView()
                case .specificPuzzle: SpecificPuzzleView()
                case .offline:       OfflinePuzzlesView()
                case .settings:      SettingsView()
                case .howToPlay:     HowToPlayView()
                case .about:         AboutView()
                case .deepLink(let code): GameView(deepLinkCode: code)
                }
            }
        }
    }
}

#Preview("iPhone") {
    ContentView()
        .environment(AppSettings())
        .previewDevice(PreviewDevice(rawValue: "iPhone 15"))
}
