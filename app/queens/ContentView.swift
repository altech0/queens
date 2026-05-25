//
//  ContentView.swift
//  queens
//
//  Created by Alex on 22/03/2026.
//

import SwiftUI

struct ContentView: View {
    @State private var showGame = false
    @State private var showSettings = false
    @State private var showHowToPlay = false
    @State private var showAbout = false
    @State private var showSpecificPuzzle = false
    @State private var showOffline = false
    @State private var deepLinkPuzzleCode: String?
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Relaxing gradient background
                LinearGradient(
                colors: [
                    Color(red: 0.95, green: 0.94, blue: 0.98), // Soft lavender
                    Color(red: 0.89, green: 0.93, blue: 0.97)  // Pale blue
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                VStack(spacing: 0) {
                Spacer()
                
                // Title
                VStack(spacing: 12) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.4, green: 0.5, blue: 0.7),
                                    Color(red: 0.5, green: 0.6, blue: 0.8)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
                    
                    Text("Queens")
                        .font(.system(size: 48, weight: .light, design: .rounded))
                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                    
                }
                
                Spacer()
                
                // Buttons section
                VStack(spacing: 16) {
                    // New Game Button
                    Button(action: {
                        showGame = true
                    }) {
                        Text("New Game")
                            .font(.system(size: 22, weight: .medium, design: .rounded))
                            .foregroundColor(.white)
                            .padding(.vertical, 18)
                            .frame(maxWidth: 280)
                            .background(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.45, green: 0.55, blue: 0.75),
                                        Color(red: 0.5, green: 0.6, blue: 0.8)
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .shadow(color: Color(red: 0.4, green: 0.5, blue: 0.7).opacity(0.3), radius: 15, x: 0, y: 8)
                    }
                    
                    // Row with Specific Puzzle and Offline buttons
                    HStack(spacing: 12) {
                        // Specific Puzzle Button
                        Button(action: {
                            showSpecificPuzzle = true
                        }) {
                            Text("Specific Puzzle")
                                .font(.system(size: 16, weight: .medium, design: .rounded))
                                .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color(red: 0.4, green: 0.5, blue: 0.7), lineWidth: 2)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(Color.white.opacity(0.3))
                                        )
                                )
                        }
                        
                        // Offline Button
                        Button(action: {
                            showOffline = true
                        }) {
                            Text("Offline")
                                .font(.system(size: 16, weight: .medium, design: .rounded))
                                .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color(red: 0.4, green: 0.5, blue: 0.7), lineWidth: 2)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(Color.white.opacity(0.3))
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
                        showHowToPlay = true
                    }) {
                        Image(systemName: "questionmark.circle")
                            .font(.system(size: 32, weight: .regular))
                            .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                    }
                    
                    // Settings
                    Button(action: {
                        showSettings = true
                    }) {
                        Image(systemName: "gearshape")
                            .font(.system(size: 32, weight: .regular))
                            .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                    }
                    
                    // About
                    Button(action: {
                        showAbout = true
                    }) {
                        Image(systemName: "info.circle")
                            .font(.system(size: 32, weight: .regular))
                            .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                    }
                }
                .padding(.bottom, 40)
                }
                .padding()
                .navigationDestination(isPresented: $showGame) {
                    GameSetupView()
                }
                .navigationDestination(isPresented: $showSpecificPuzzle) {
                    SpecificPuzzleView()
                }
                .navigationDestination(isPresented: $showOffline) {
                    OfflinePuzzlesView()
                }
                .navigationDestination(isPresented: $showSettings) {
                    SettingsView()
                }
                .navigationDestination(isPresented: $showHowToPlay) {
                    HowToPlayView()
                }
                .navigationDestination(isPresented: $showAbout) {
                    AboutView()
                }
                .navigationDestination(item: $deepLinkPuzzleCode) { code in
                    DeepLinkPuzzleView(puzzleCode: code)
                }
                .onReceive(NotificationCenter.default.publisher(for: .openPuzzle)) { notification in
                    if let code = notification.userInfo?["code"] as? String {
                        deepLinkPuzzleCode = code
                    }
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
