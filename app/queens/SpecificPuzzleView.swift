//
//  SpecificPuzzleView.swift
//  queens
//
//  Created by Alex on 15/04/2026.
//

import SwiftUI
import os.log

struct SpecificPuzzleView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var puzzleCode = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var loadedPuzzle: StarBattlePuzzle?
    @State private var navigateToGame = false
    
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.app.queens", category: "SpecificPuzzleView")
    
    var body: some View {
        GeometryReader { geometry in
            let isIPad = geometry.size.width > 600
            let maxContentWidth: CGFloat = isIPad ? 500 : geometry.size.width
            
            ZStack {
                // Same relaxing background
                LinearGradient(
                    colors: [
                        Color(red: 0.95, green: 0.94, blue: 0.98),
                        Color(red: 0.89, green: 0.93, blue: 0.97)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                HStack(spacing: 0) {
                    if isIPad {
                        Spacer()
                    }
                    
                    VStack(spacing: isIPad ? 24 : 30) {
                        // Header
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
                        }
                        .padding(.horizontal)
                        .padding(.top, 10)
                        
                        Spacer()
                        
                        // Title and description
                        VStack(spacing: 12) {
                            Text("Enter Puzzle Code")
                                .font(.system(size: isIPad ? 28 : 32, weight: .medium, design: .rounded))
                                .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                            
                            Text("Type the puzzle number to load")
                                .font(.system(size: isIPad ? 15 : 16, weight: .regular, design: .rounded))
                                .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                                .opacity(0.8)
                        }
                        
                        // Puzzle code input
                        VStack(spacing: 16) {
                            TextField("12345", text: $puzzleCode)
                                .keyboardType(.numberPad)
                                .font(.system(size: isIPad ? 24 : 28, weight: .medium, design: .monospaced))
                                .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                                .multilineTextAlignment(.center)
                                .padding(.vertical, isIPad ? 16 : 20)
                                .padding(.horizontal, isIPad ? 24 : 30)
                                .background(
                                    RoundedRectangle(cornerRadius: 16)
                                        .fill(Color.white.opacity(0.7))
                                        .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)
                                )
                                .frame(maxWidth: isIPad ? 320 : 280)
                            
                            // Error message
                            if let error = errorMessage {
                                Text(error)
                                    .font(.system(size: 15, weight: .medium, design: .rounded))
                                    .foregroundColor(Color(red: 0.8, green: 0.4, blue: 0.4))
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 40)
                            }
                        }
                        
                        // Go button
                        Button(action: {
                            Task {
                                await loadPuzzle()
                            }
                        }) {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                                    .frame(maxWidth: isIPad ? 320 : 280)
                                    .padding(.vertical, isIPad ? 16 : 18)
                            } else {
                                Text("Go")
                                    .font(.system(size: isIPad ? 18 : 20, weight: .medium, design: .rounded))
                                    .foregroundColor(.white)
                                    .frame(maxWidth: isIPad ? 320 : 280)
                                    .padding(.vertical, isIPad ? 16 : 18)
                            }
                        }
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
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .shadow(color: Color(red: 0.4, green: 0.5, blue: 0.7).opacity(0.3), radius: 12, x: 0, y: 6)
                        .disabled(isLoading || puzzleCode.isEmpty)
                        .opacity((isLoading || puzzleCode.isEmpty) ? 0.5 : 1.0)
                        
                        Spacer()
                    }
                    .frame(maxWidth: maxContentWidth)
                    
                    if isIPad {
                        Spacer()
                    }
                }
            }
            .navigationBarHidden(true)
            .navigationDestination(isPresented: $navigateToGame) {
                if let puzzle = loadedPuzzle {
                    GameView(puzzle: puzzle, puzzleID: puzzleCode)
                }
            }
        }
    }
    
    private func loadPuzzle() async {
        guard !puzzleCode.isEmpty else { return }
        
        logger.info("🎯 Loading specific puzzle: \(puzzleCode)")
        isLoading = true
        errorMessage = nil
        
        do {
            let puzzle = try await PuzzleFetcher.fetchSpecificPuzzle(code: puzzleCode)
            logger.info("✅ Puzzle loaded successfully")
            
            loadedPuzzle = puzzle
            navigateToGame = true
            
        } catch let error as PuzzleFetchError {
            logger.error("❌ Error loading puzzle: \(error.localizedDescription)")
            
            if case .httpError(let statusCode) = error, statusCode == 404 {
                errorMessage = "Puzzle not found"
            } else {
                errorMessage = error.errorDescription ?? "Failed to load puzzle"
            }
            
        } catch {
            logger.error("❌ Unexpected error: \(error.localizedDescription)")
            errorMessage = "Failed to load puzzle"
        }
        
        isLoading = false
    }
}

#Preview {
    NavigationStack {
        SpecificPuzzleView()
            .environment(AppSettings())
    }
}
#Preview("iPad") {
    NavigationStack {
        SpecificPuzzleView()
            .environment(AppSettings())
    }
    .previewDevice(PreviewDevice(rawValue: "iPad Pro (12.9-inch) (6th generation)"))
}

