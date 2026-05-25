//
//  OfflinePuzzlesView.swift
//  queens
//
//  Created by Alex on 18/04/2026.
//

import SwiftUI
import os.log

struct OfflinePuzzlesView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PuzzleCache.self) private var cache
    
    @State private var selectedSize = 6
    @State private var selectedStars = 1
    @State private var isLoading = false
    @State private var loadError: String?
    @State private var selectedPuzzle: CachedPuzzle?
    @State private var showGame = false
    
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.app.queens", category: "OfflinePuzzlesView")
    
    // Available puzzle sizes and stars (matching GameSetupView)
    private let sizeOptions = [6, 8, 10]
    private let starOptions = [1, 2]
    
    // Valid combinations: 6×6 (1 star), 8×8 (1 or 2 stars), 10×10 (2 stars)
    private var availableStarOptions: [Int] {
        switch selectedSize {
        case 6:
            return [1]
        case 8:
            return [1, 2]
        case 10:
            return [2]
        default:
            return [1]
        }
    }
    
    var body: some View {
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
            
            VStack(spacing: 0) {
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
                    
                    Text("Offline Play")
                        .font(.system(size: 24, weight: .medium, design: .rounded))
                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                    
                    Spacer()
                    
                    // Placeholder for symmetry
                    Color.clear
                        .frame(width: 44, height: 44)
                }
                .padding(.horizontal)
                .padding(.top, 10)
                
                // Top section: Add to cache controls (top third)
                VStack(spacing: 12) {
                    // Stars Per Region Selector
                    VStack(spacing: 8) {
                        HStack(spacing: 16) {
                            ForEach(starOptions, id: \.self) { stars in
                                let isAvailable = availableStarOptions.contains(stars)
                                
                                Button(action: {
                                    if isAvailable {
                                        selectedStars = stars
                                    }
                                }) {
                                    Text("\(stars) Star\(stars > 1 ? "s" : "")")
                                        .font(.system(size: 16, weight: .medium, design: .rounded))
                                        .foregroundColor(isAvailable ? (selectedStars == stars ? .white : Color(red: 0.45, green: 0.55, blue: 0.75)) : Color(red: 0.6, green: 0.62, blue: 0.68))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 12)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(selectedStars == stars && isAvailable ?
                                                    LinearGradient(
                                                        colors: [
                                                            Color(red: 0.45, green: 0.55, blue: 0.75),
                                                            Color(red: 0.5, green: 0.6, blue: 0.8)
                                                        ],
                                                        startPoint: .leading,
                                                        endPoint: .trailing
                                                    ) :
                                                    LinearGradient(
                                                        colors: [
                                                            Color(red: 0.92, green: 0.92, blue: 0.95),
                                                            Color(red: 0.92, green: 0.92, blue: 0.95)
                                                        ],
                                                        startPoint: .leading,
                                                        endPoint: .trailing
                                                    )
                                                )
                                        )
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(selectedStars == stars ? Color(red: 0.45, green: 0.55, blue: 0.75) : Color.clear, lineWidth: 2)
                                        )
                                        .opacity(isAvailable ? 1.0 : 0.5)
                                }
                                .disabled(!isAvailable)
                            }
                        }
                        .padding(.horizontal, 50)
                    }
                    
                    // Size Selector
                    VStack(spacing: 8) {
                        HStack(spacing: 16) {
                            ForEach(sizeOptions, id: \.self) { size in
                                Button(action: {
                                    selectedSize = size
                                    // Auto-adjust stars to valid option for this size
                                    if !availableStarOptions.contains(selectedStars) {
                                        selectedStars = availableStarOptions.first ?? 1
                                    }
                                }) {
                                    Text("\(size)×\(size)")
                                        .font(.system(size: 18, weight: .semibold, design: .rounded))
                                        .foregroundColor(selectedSize == size ? .white : Color(red: 0.45, green: 0.55, blue: 0.75))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 12)
                                    .background(
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(selectedSize == size ?
                                                LinearGradient(
                                                    colors: [
                                                        Color(red: 0.45, green: 0.55, blue: 0.75),
                                                        Color(red: 0.5, green: 0.6, blue: 0.8)
                                                    ],
                                                    startPoint: .leading,
                                                    endPoint: .trailing
                                                ) :
                                                LinearGradient(
                                                    colors: [
                                                        Color(red: 0.92, green: 0.92, blue: 0.95),
                                                        Color(red: 0.92, green: 0.92, blue: 0.95)
                                                    ],
                                                    startPoint: .leading,
                                                    endPoint: .trailing
                                                )
                                            )
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(selectedSize == size ? Color(red: 0.45, green: 0.55, blue: 0.75) : Color.clear, lineWidth: 2)
                                    )
                                }
                            }
                        }
                        .padding(.horizontal, 50)
                    }
                    
                    // Add to Cache button
                    Button(action: {
                        Task {
                            await addPuzzleToCache()
                        }
                    }) {
                        HStack(spacing: 8) {
                            if isLoading {
                                ProgressView()
                                    .scaleEffect(0.8)
                                    .tint(.white)
                            } else {
                                Image(systemName: "arrow.down.circle.fill")
                                    .font(.system(size: 18))
                            }
                            Text("Add to Cache")
                                .font(.system(size: 18, weight: .medium, design: .rounded))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: 400) // Increased from 280 for iPad
                        .padding(.vertical, 14)
                        .background(
                            LinearGradient(
                                colors: isAddDisabled ? [
                                    Color(red: 0.7, green: 0.72, blue: 0.76),
                                    Color(red: 0.65, green: 0.67, blue: 0.71)
                                ] : [
                                    Color(red: 0.45, green: 0.55, blue: 0.75),
                                    Color(red: 0.5, green: 0.6, blue: 0.8)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .shadow(color: Color(red: 0.4, green: 0.5, blue: 0.7).opacity(0.3), radius: 10, x: 0, y: 5)
                    }
                    .disabled(isAddDisabled || isLoading)
                    .opacity(isAddDisabled ? 0.6 : 1.0)
                    
                    if let error = loadError {
                        Text(error)
                            .font(.system(size: 14, weight: .regular, design: .rounded))
                            .foregroundColor(Color(red: 0.8, green: 0.4, blue: 0.4))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                    }
                }
                .padding(.top, 20)
                
                Divider()
                    .background(Color(red: 0.5, green: 0.55, blue: 0.65).opacity(0.3))
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                
                // Bottom section: Cached puzzles list
                VStack(spacing: 12) {
                    Text("Cached Puzzles")
                        .font(.system(size: 18, weight: .medium, design: .rounded))
                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                    
                    if cache.puzzles.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "tray")
                                .font(.system(size: 50))
                                .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65).opacity(0.5))
                            
                            Text("No cached puzzles")
                                .font(.system(size: 16, weight: .regular, design: .rounded))
                                .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .padding(.top, 40)
                    } else {
                        ScrollView {
                            VStack(spacing: 8) {
                                ForEach(cache.puzzles) { puzzle in
                                    CachedPuzzleRow(
                                        puzzle: puzzle,
                                        isSelected: selectedPuzzle?.id == puzzle.id
                                    )
                                    .onTapGesture {
                                        withAnimation(.easeInOut(duration: 0.2)) {
                                            selectedPuzzle = selectedPuzzle?.id == puzzle.id ? nil : puzzle
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.bottom, 100) // Space for bottom buttons
                        }
                    }
                }
                .frame(maxHeight: .infinity)
                
                // Bottom buttons (Play and Remove)
                HStack(spacing: 16) {
                    Button(action: {
                        showGame = true
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "play.fill")
                                .font(.system(size: 16))
                            Text("Play")
                                .font(.system(size: 18, weight: .medium, design: .rounded))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            LinearGradient(
                                colors: selectedPuzzle == nil ? [
                                    Color(red: 0.7, green: 0.72, blue: 0.76),
                                    Color(red: 0.65, green: 0.67, blue: 0.71)
                                ] : [
                                    Color(red: 0.45, green: 0.55, blue: 0.75),
                                    Color(red: 0.5, green: 0.6, blue: 0.8)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .shadow(color: Color(red: 0.4, green: 0.5, blue: 0.7).opacity(0.3), radius: 10, x: 0, y: 5)
                    }
                    .disabled(selectedPuzzle == nil)
                    .opacity(selectedPuzzle == nil ? 0.6 : 1.0)
                    
                    Button(action: {
                        if let puzzle = selectedPuzzle {
                            withAnimation {
                                cache.remove(puzzle)
                                selectedPuzzle = nil
                            }
                        }
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "trash.fill")
                                .font(.system(size: 16))
                            Text("Remove")
                                .font(.system(size: 18, weight: .medium, design: .rounded))
                        }
                        .foregroundColor(selectedPuzzle == nil ? Color(red: 0.6, green: 0.62, blue: 0.68) : Color(red: 0.8, green: 0.4, blue: 0.4))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(selectedPuzzle == nil ? Color(red: 0.6, green: 0.62, blue: 0.68) : Color(red: 0.8, green: 0.4, blue: 0.4), lineWidth: 2)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.3))
                                )
                        )
                    }
                    .disabled(selectedPuzzle == nil)
                    .opacity(selectedPuzzle == nil ? 0.6 : 1.0)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 20)
            }
        }
        .navigationBarHidden(true)
        .navigationDestination(isPresented: $showGame) {
            if let puzzle = selectedPuzzle {
                GameView(puzzle: puzzle.puzzle, puzzleID: puzzle.id)
            }
        }
    }
    
    /// Check if "Add to Cache" button should be disabled
    private var isAddDisabled: Bool {
        // Only 8×8 2 stars has a limit of 2 puzzles
        if selectedSize == 8 && selectedStars == 2 {
            let currentCount = cache.count(size: selectedSize, stars: selectedStars)
            return currentCount >= 2
        }
        // All other configurations use the default max cache size (50)
        return false
    }
    
    /// Fetch and add a puzzle to the cache
    private func addPuzzleToCache() async {
        logger.info("📥 Adding puzzle to cache: \(selectedSize)×\(selectedSize), \(selectedStars) stars")
        
        isLoading = true
        loadError = nil
        
        do {
            // Fetch puzzle from API
            let puzzle = try await PuzzleFetcher.fetchPuzzle(size: selectedSize, starsPerUnit: selectedStars, excludeID: nil)
            
            // Add to cache
            let success = cache.add(puzzle)
            
            if success {
                logger.info("✅ Puzzle added to cache successfully")
                loadError = nil
            } else {
                logger.warning("⚠️ Failed to add puzzle to cache (might be duplicate)")
                loadError = "Puzzle already in cache or cache is full"
            }
            
        } catch let error as PuzzleFetchError {
            logger.error("❌ Failed to fetch puzzle: \(error.localizedDescription)")
            loadError = error.errorDescription ?? "Failed to fetch puzzle"
            
        } catch {
            logger.error("❌ Unexpected error: \(error.localizedDescription)")
            loadError = "Failed to download puzzle"
        }
        
        isLoading = false
    }
}

/// Row view for a cached puzzle
struct CachedPuzzleRow: View {
    let puzzle: CachedPuzzle
    let isSelected: Bool
    
    var body: some View {
        HStack(spacing: 12) {
            // Selection indicator
            Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 22))
                .foregroundColor(isSelected ? Color(red: 0.4, green: 0.5, blue: 0.7) : Color(red: 0.6, green: 0.62, blue: 0.68))
            
            VStack(alignment: .leading, spacing: 4) {
                // Puzzle name
                Text(puzzle.displayName)
                    .font(.system(size: 16, weight: .medium, design: .rounded))
                    .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                
                // Puzzle ID
                Text("ID: \(puzzle.id)")
                    .font(.system(size: 13, weight: .regular, design: .monospaced))
                    .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                    .opacity(0.8)
                
                // Completion info (if completed)
                if let time = puzzle.completionTime {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 12))
                            .foregroundColor(Color(red: 0.4, green: 0.7, blue: 0.4))
                        
                        // Time
                        Text(formatTime(time))
                            .font(.system(size: 12, weight: .regular, design: .monospaced))
                            .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                    }
                }
            }
            
            Spacer()
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(isSelected ? Color(red: 0.4, green: 0.5, blue: 0.7).opacity(0.1) : Color.white.opacity(0.4))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isSelected ? Color(red: 0.4, green: 0.5, blue: 0.7) : Color.clear, lineWidth: 2)
        )
    }
    
    private func formatTime(_ timeInterval: TimeInterval) -> String {
        let minutes = Int(timeInterval) / 60
        let seconds = Int(timeInterval) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}

#Preview {
    NavigationStack {
        OfflinePuzzlesView()
            .environment(PuzzleCache())
    }
}
