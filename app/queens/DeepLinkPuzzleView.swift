//
//  DeepLinkPuzzleView.swift
//  queens
//
//  Created by Alex on 22/03/2026.
//

import SwiftUI

/// View that loads and displays a puzzle from a deep link
struct DeepLinkPuzzleView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    
    let puzzleCode: String
    
    @State private var puzzle: StarBattlePuzzle?
    @State private var isLoading = true
    @State private var loadError: String?
    @State private var navigateToGame = false
    
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
            
            if isLoading {
                VStack(spacing: 20) {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(Color(red: 0.4, green: 0.5, blue: 0.7))
                    
                    Text("Loading shared puzzle...")
                        .font(.system(size: 18, weight: .regular, design: .rounded))
                        .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                }
            } else if let error = loadError {
                VStack(spacing: 20) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(Color(red: 0.8, green: 0.4, blue: 0.4))
                    
                    Text(error)
                        .font(.system(size: 18, weight: .medium, design: .rounded))
                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                    
                    Button(action: {
                        dismiss()
                    }) {
                        Text("Back to Home")
                            .font(.system(size: 18, weight: .medium, design: .rounded))
                            .foregroundColor(.white)
                            .frame(maxWidth: 200)
                            .padding(.vertical, 14)
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
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .padding(.top, 10)
                }
            }
        }
        .navigationBarHidden(true)
        .navigationDestination(isPresented: $navigateToGame) {
            if let puzzle = puzzle {
                GameView(puzzle: puzzle, puzzleID: puzzle.code ?? puzzleCode)
            }
        }
        .task {
            await loadPuzzle()
        }
    }
    
    private func loadPuzzle() async {
        isLoading = true
        loadError = nil
        
        do {
            let fetchedPuzzle = try await PuzzleFetcher.fetchPuzzleByCode(puzzleCode)
            self.puzzle = fetchedPuzzle
            
            // Navigate to game
            await MainActor.run {
                navigateToGame = true
                isLoading = false
            }
            
        } catch let error as PuzzleFetchError {
            await MainActor.run {
                if !hasApp {
                    // Try to open App Store
                    openAppStore()
                } else {
                    loadError = error.errorDescription ?? "Could not load puzzle #\(puzzleCode)"
                    isLoading = false
                }
            }
        } catch {
            await MainActor.run {
                if !hasApp {
                    // Try to open App Store
                    openAppStore()
                } else {
                    loadError = "Could not load puzzle #\(puzzleCode)"
                    isLoading = false
                }
            }
        }
    }
    
    private var hasApp: Bool {
        // If we got here, the app is installed
        return true
    }
    
    private func openAppStore() {
        // TODO: Replace with actual App Store URL when app is published
        // let appStoreURL = URL(string: "https://apps.apple.com/app/idYOUR_APP_ID")!
        // openURL(appStoreURL)
        
        loadError = "Download Queens from the App Store to play this puzzle"
        isLoading = false
    }
}
