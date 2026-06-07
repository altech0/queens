//
//  GameView.swift
//  queens
//
//  Created by Alex on 22/03/2026.
//

import SwiftUI
import os.log

enum CellState {
    case empty
    case marked  // X mark - "I don't think a star goes here"
    case star    // Star placed
}

struct GameView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppSettings.self) private var settings
    @Environment(PuzzleCache.self) private var cache
    @Environment(\.scenePhase) private var scenePhase
    
    @State private var puzzle: StarBattlePuzzle?
    @State private var cellStates: [GridPosition: CellState] = [:]
    @State private var isLoading = true
    @State private var loadingError: String?
    @State private var errorCells: Set<GridPosition> = []
    @State private var showingErrors = false
    @State private var startTime: Date?
    @State private var elapsedTime: TimeInterval = 0
    @State private var timer: Timer?
    @State private var isCompleted = false
    @State private var completionTime: TimeInterval = 0
    @State private var pausedTime: TimeInterval = 0 // Track time when paused
    
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.app.queens", category: "GameView")
    @State private var showCongratulations = false
    @State private var isSolutionVisible = false
    @State private var savedCellStates: [GridPosition: CellState] = [:]
    
    // Undo/Redo support
    @State private var undoStack: [[GridPosition: CellState]] = []
    @State private var redoStack: [[GridPosition: CellState]] = []

    @State private var timerPulse = false
    @State private var showProgressToast = false
    @State private var menuOpen = false
    
    // Cached region colors (to prevent randomization on every redraw)
    @State private var regionColors: [Int: Color] = [:]
    
    // Save to cache support
    @State private var showSaveMessage = false
    @State private var saveMessage = ""
    
    // Completion hint support
    @State private var showCompletionHint = false
    @State private var hasShownHintThisSession = false

    private var conflictCells: Set<GridPosition> {
        guard let puzzle = puzzle else { return [] }
        let stars = Set(cellStates.filter { $0.value == .star }.keys)
        var conflicts = Set<GridPosition>()
        let limit = puzzle.starsPerRegion

        let byRow = Dictionary(grouping: stars, by: \.row)
        for (_, rowStars) in byRow where rowStars.count > limit {
            conflicts.formUnion(rowStars)
        }

        let byCol = Dictionary(grouping: stars, by: \.column)
        for (_, colStars) in byCol where colStars.count > limit {
            conflicts.formUnion(colStars)
        }

        let byRegion = Dictionary(grouping: stars, by: { puzzle.regions[$0.row][$0.column] })
        for (_, regionStars) in byRegion where regionStars.count > limit {
            conflicts.formUnion(regionStars)
        }

        for star in stars {
            for dr in -1...1 {
                for dc in -1...1 {
                    guard dr != 0 || dc != 0 else { continue }
                    if stars.contains(GridPosition(row: star.row + dr, column: star.column + dc)) {
                        conflicts.insert(star)
                    }
                }
            }
        }

        return conflicts
    }
    
    // iPad sidebar position
    @State private var sidebarOnLeft = false
    
    // Offline mode support
    private let providedPuzzle: StarBattlePuzzle?
    private let puzzleID: String?
    private let deepLinkCode: String?

    // Puzzle generation parameters
    private let puzzleSize: Int
    private let starsPerUnit: Int

    private let onDismiss: (() -> Void)?

    /// Initialize GameView for online mode (fetches puzzle from API)
    init() {
        self.providedPuzzle = nil
        self.puzzleID = nil
        self.deepLinkCode = nil
        self.puzzleSize = 6
        self.starsPerUnit = 1
        self.onDismiss = nil
    }

    /// Initialize GameView with custom puzzle parameters
    init(puzzleSize: Int, starsPerUnit: Int) {
        self.providedPuzzle = nil
        self.puzzleID = nil
        self.deepLinkCode = nil
        self.puzzleSize = puzzleSize
        self.starsPerUnit = starsPerUnit
        self.onDismiss = nil
    }

    /// Initialize GameView for offline/specific puzzle mode (uses provided puzzle)
    init(puzzle: StarBattlePuzzle, puzzleID: String, onDismiss: (() -> Void)? = nil) {
        self.providedPuzzle = puzzle
        self.puzzleID = puzzleID
        self.deepLinkCode = nil
        self.puzzleSize = puzzle.size
        self.starsPerUnit = puzzle.starsPerRegion
        self.onDismiss = onDismiss
    }

    /// Initialize GameView for deep link (fetches puzzle by code, shows loading inline)
    init(deepLinkCode: String) {
        self.providedPuzzle = nil
        self.puzzleID = nil
        self.deepLinkCode = deepLinkCode
        self.puzzleSize = 6
        self.starsPerUnit = 1
        self.onDismiss = nil
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
            
            if let error = loadingError {
                // Error state
                VStack(spacing: 16) {
                    Image(systemName: "cup.and.saucer.fill")
                        .font(.system(size: 60))
                        .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                    
                    Text(error)
                        .font(.system(size: 18, weight: .medium, design: .rounded))
                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                        .padding(.top, 8)
                    
                    Button(action: {
                        dismiss()
                    }) {
                        Text("Home")
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
                            .shadow(color: Color(red: 0.4, green: 0.5, blue: 0.7).opacity(0.3), radius: 10, x: 0, y: 5)
                    }
                    .padding(.top, 24)
                }
                .padding()
            } else if isLoading {
                // Loading spinner
                VStack(spacing: 20) {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(Color(red: 0.4, green: 0.5, blue: 0.7))
                    
                    Text("Loading puzzle...")
                        .font(.system(size: 18, weight: .regular, design: .rounded))
                        .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                }
            } else if let puzzle = puzzle {
                // Game content
                gameContent(puzzle: puzzle)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .overlay(alignment: .top) {
            // Save message toast
            if showSaveMessage {
                VStack {
                    Text(saveMessage)
                        .font(.system(size: 15, weight: .medium, design: .rounded))
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color(red: 0.4, green: 0.5, blue: 0.7))
                                .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
                        )
                        .padding(.top, 60)
                        .transition(.move(edge: .top).combined(with: .opacity))
                }
                .animation(.spring(response: 0.4, dampingFraction: 0.8), value: showSaveMessage)
            }
        }
        .overlay(alignment: .top) {
            // Progress toast — shown when check is tapped and everything so far is correct
            if showProgressToast {
                VStack {
                    Text("✓ Looking good so far!")
                        .font(.system(size: 15, weight: .medium, design: .rounded))
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color(red: 0.4, green: 0.5, blue: 0.7))
                                .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
                        )
                        .padding(.top, 60)
                        .transition(.move(edge: .top).combined(with: .opacity))
                }
                .animation(.spring(response: 0.4, dampingFraction: 0.8), value: showProgressToast)
            }
        }
        .task {
            // Load puzzle when view appears
            await loadPuzzle()
        }
        .onDisappear {
            stopTimer()
        }
        .onChange(of: scenePhase) { oldPhase, newPhase in
            handleScenePhaseChange(newPhase)
        }
        .alert("Not quite right", isPresented: $showCompletionHint) {
            Button("Dismiss", role: .cancel) { }
            Button("Don't show again") {
                settings.showCompletionHints = false
            }
        } message: {
            Text("Press the ✓ button in the top right to check your progress")
        }
    }
    
    @ViewBuilder
    private func gameContent(puzzle: StarBattlePuzzle) -> some View {
        // Use different layouts based on device
        if UIDevice.current.userInterfaceIdiom == .pad {
            iPadLayout(puzzle: puzzle)
        } else {
            iPhoneLayout(puzzle: puzzle)
        }
    }
    
    // MARK: - iPad Layout
    @ViewBuilder
    private func iPadLayout(puzzle: StarBattlePuzzle) -> some View {
        HStack(spacing: 0) {
            if sidebarOnLeft {
                // Sidebar on left (flush to edge)
                iPadSidebar(puzzle: puzzle)
                    .frame(width: 320)
                
                Divider()
                
                // Grid section with back button
                ZStack(alignment: .topLeading) {
                    iPadGridSection(puzzle: puzzle)
                        .padding(.leading, 60) // Make room for back button
                    
                    // Back button in top left
                    Button(action: {
                        onDismiss?()
                        dismiss()
                    }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                            .frame(width: 44, height: 44)
                    }
                    .padding(.top, 16)
                    .padding(.leading, 16)
                }
            } else {
                // Grid section with back button
                ZStack(alignment: .topLeading) {
                    iPadGridSection(puzzle: puzzle)
                        .padding(.leading, 60) // Make room for back button
                    
                    // Back button in top left
                    Button(action: {
                        onDismiss?()
                        dismiss()
                    }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                            .frame(width: 44, height: 44)
                    }
                    .padding(.top, 16)
                    .padding(.leading, 16)
                }
                
                Divider()
                
                // Sidebar on right (flush to edge)
                iPadSidebar(puzzle: puzzle)
                    .frame(width: 320)
            }
        }
    }
    
    @ViewBuilder
    private func iPadGridSection(puzzle: StarBattlePuzzle) -> some View {
        ZStack {
            GameGridView(
                puzzle: puzzle,
                cellStates: $cellStates,
                errorCells: errorCells,
                showingErrors: showingErrors,
                conflictCells: conflictCells,
                showConflicts: settings.highlightConflicts,
                enhancedContrast: settings.enhancedContrastMode,
                regionColors: regionColors,
                singleTapMode: settings.singleTapMode,
                onCellToggle: {
                    autoCheckSolution()
                },
                onSaveUndo: {
                    saveStateForUndo()
                }
            )
            .padding(40)
            .disabled(isCompleted)
            
            // Completion animation overlay
            if isCompleted {
                VStack(spacing: 20) {
                    Text("Congratulations!")
                        .font(.system(size: 48, weight: .bold, design: .rounded))
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
                        .scaleEffect(showCongratulations ? 1.0 : 0.5)
                        .opacity(showCongratulations ? 0 : 1)
                    
                    // Time display with share button
                    HStack(spacing: 12) {
                        Text(formatTime(completionTime))
                            .font(.system(size: 40, weight: .semibold, design: .monospaced))
                            .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                        
                        // Share button - appears with time
                        if showCongratulations {
                            ShareLink(item: generateShareText(puzzle: puzzle, time: completionTime)) {
                                Image(systemName: "square.and.arrow.up")
                                    .font(.system(size: 20, weight: .medium))
                                    .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                                    .frame(width: 32, height: 32)
                            }
                        }
                    }
                    .padding(.horizontal, 32)
                    .padding(.vertical, 16)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.white.opacity(0.9))
                            .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
                    )
                    .opacity(showCongratulations ? 1 : 0)
                }
                .padding()
            }
        }
    }
    
    @ViewBuilder
    private func iPadSidebar(puzzle: StarBattlePuzzle) -> some View {
        VStack(spacing: 0) {
            // Header section
            VStack(spacing: 20) {
                // Title and swap sidebar button
                HStack {
                    Spacer()
                    
                    Text("Queens")
                        .font(.system(size: 28, weight: .medium, design: .rounded))
                        .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                    
                    Spacer()
                    
                    // Swap sidebar button
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            sidebarOnLeft.toggle()
                        }
                    }) {
                        Image(systemName: sidebarOnLeft ? "sidebar.right" : "sidebar.left")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                            .frame(width: 44, height: 44)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                
                Divider()
                    .padding(.horizontal, 16)
                
                // Game info
                VStack(spacing: 10) {
                    Text("\(puzzle.size)×\(puzzle.size) Grid")
                        .font(.system(size: 17, weight: .medium, design: .rounded))
                        .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                    
                    Text("\(puzzle.starsPerRegion) star\(puzzle.starsPerRegion > 1 ? "s" : "") per row, column & region")
                        .font(.system(size: 14, weight: .regular, design: .rounded))
                        .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                        .opacity(0.85)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .padding(.horizontal, 16)
                    
                    if let code = puzzle.code {
                        Text("ID: \(code)")
                            .font(.system(size: 13, weight: .medium, design: .monospaced))
                            .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                            .opacity(0.7)
                            .padding(.top, 4)
                    }
                    
                    if !settings.hideTimer {
                        Text(formatTimeLive(elapsedTime))
                            .font(.system(size: 20, weight: .semibold, design: .monospaced))
                            .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                            .padding(.top, 8)
                            .scaleEffect(timerPulse ? 1.07 : 1.0)
                            .animation(.easeOut(duration: 0.25), value: timerPulse)
                    }
                }
                .padding(.horizontal, 20)
                
                Divider()
                    .padding(.horizontal, 16)
            }
            
            // Controls section
            ScrollView {
                VStack(spacing: 20) {
                    // Quick Actions Group
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Quick Actions")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                            .opacity(0.8)
                            .padding(.horizontal, 4)
                        
                        VStack(spacing: 10) {
                            Button(action: {
                                savePuzzleToCache()
                            }) {
                                HStack(spacing: 8) {
                                    Image(systemName: "plus.circle.fill")
                                        .font(.system(size: 18))
                                    Text("Save to Cache")
                                        .font(.system(size: 16, weight: .medium, design: .rounded))
                                    Spacer()
                                }
                                .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.5))
                                )
                            }
                            
                            Button(action: {
                                checkSolution()
                            }) {
                                HStack(spacing: 8) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 18))
                                    Text("Check Solution")
                                        .font(.system(size: 16, weight: .medium, design: .rounded))
                                    Spacer()
                                }
                                .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.5))
                                )
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    
                    // Puzzle Controls Group
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Puzzle Controls")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                            .opacity(0.8)
                            .padding(.horizontal, 4)
                        
                        VStack(spacing: 10) {
                            // New Puzzle Button - Only show for online mode
                            if puzzleID == nil {
                                Button(action: {
                                    Task {
                                        await loadPuzzle()
                                        resetGame()
                                    }
                                }) {
                                    HStack(spacing: 8) {
                                        Image(systemName: "sparkles")
                                            .font(.system(size: 18))
                                        Text("New Puzzle")
                                            .font(.system(size: 16, weight: .medium, design: .rounded))
                                        Spacer()
                                    }
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 16)
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
                            }
                            
                            Button(action: {
                                resetCurrentPuzzle()
                            }) {
                                HStack(spacing: 8) {
                                    Image(systemName: "arrow.clockwise")
                                        .font(.system(size: 18))
                                    Text("Reset Puzzle")
                                        .font(.system(size: 16, weight: .medium, design: .rounded))
                                    Spacer()
                                }
                                .foregroundColor(Color(red: 0.6, green: 0.62, blue: 0.68))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.5))
                                )
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    
                    // History Controls Group
                    VStack(alignment: .leading, spacing: 12) {
                        Text("History")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                            .opacity(0.8)
                            .padding(.horizontal, 4)
                        
                        VStack(spacing: 10) {
                            Button(action: {
                                performUndo()
                            }) {
                                HStack(spacing: 8) {
                                    Image(systemName: "arrow.uturn.backward")
                                        .font(.system(size: 18))
                                    Text("Undo")
                                        .font(.system(size: 16, weight: .medium, design: .rounded))
                                    Spacer()
                                }
                                .foregroundColor(undoStack.isEmpty ? Color(red: 0.7, green: 0.72, blue: 0.76) : Color(red: 0.5, green: 0.6, blue: 0.75))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.5))
                                )
                            }
                            .disabled(undoStack.isEmpty)
                            .opacity(undoStack.isEmpty ? 0.5 : 1.0)
                            
                            Button(action: {
                                performRedo()
                            }) {
                                HStack(spacing: 8) {
                                    Image(systemName: "arrow.uturn.forward")
                                        .font(.system(size: 18))
                                    Text("Redo")
                                        .font(.system(size: 16, weight: .medium, design: .rounded))
                                    Spacer()
                                }
                                .foregroundColor(redoStack.isEmpty ? Color(red: 0.7, green: 0.72, blue: 0.76) : Color(red: 0.5, green: 0.6, blue: 0.75))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color.white.opacity(0.5))
                                )
                            }
                            .disabled(redoStack.isEmpty)
                            .opacity(redoStack.isEmpty ? 0.5 : 1.0)
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.top, 8)
                .padding(.bottom, 30)
            }
            
            Spacer()
        }
        .background(Color.white.opacity(0.4))
    }
    
    @ViewBuilder
    private func menuRow(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                    .frame(width: 20)
                Text(label)
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundColor(Color(red: 0.25, green: 0.28, blue: 0.38))
                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 11)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // MARK: - iPhone Layout
    @ViewBuilder
    private func iPhoneLayout(puzzle: StarBattlePuzzle) -> some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                Button(action: {
                    onDismiss?()
                    dismiss()
                }) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                        .frame(width: 44, height: 44)
                }
                
                Spacer()
                
                Spacer()
                
                // Burger button
                Button(action: {
                    withAnimation(.spring(response: 0.28, dampingFraction: 0.72)) {
                        menuOpen.toggle()
                    }
                }) {
                    Image(systemName: menuOpen ? "xmark" : "line.3.horizontal")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                        .frame(width: 44, height: 44)
                        .contentTransition(.symbolEffect(.replace))
                }
            }
            .padding(.horizontal)
            .padding(.top, 10)

            // Game info
            VStack(spacing: 8) {
                Text("\(puzzle.size)×\(puzzle.size) Grid")
                    .font(.system(size: 16, weight: .regular, design: .rounded))
                    .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                
                Text("\(puzzle.starsPerRegion) star\(puzzle.starsPerRegion > 1 ? "s" : "") per row, column & region")
                    .font(.system(size: 14, weight: .regular, design: .rounded))
                    .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                    .opacity(0.8)
                
                // Puzzle ID/Code
                if let code = puzzle.code {
                    Text("Puzzle ID: \(code)")
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .foregroundColor(Color(red: 0.5, green: 0.55, blue: 0.65))
                        .opacity(0.7)
                        .padding(.top, 2)
                }
                
                // Timer display
                if !settings.hideTimer {
                    Text(formatTimeLive(elapsedTime))
                        .font(.system(size: 16, weight: .medium, design: .monospaced))
                        .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                        .padding(.top, 4)
                        .scaleEffect(timerPulse ? 1.07 : 1.0)
                        .animation(.easeOut(duration: 0.25), value: timerPulse)
                }
            }
            
            Spacer()
            
            // Game Grid with completion overlay
            ZStack {
                GameGridView(
                    puzzle: puzzle,
                    cellStates: $cellStates,
                    errorCells: errorCells,
                    showingErrors: showingErrors,
                    conflictCells: conflictCells,
                    showConflicts: settings.highlightConflicts,
                    enhancedContrast: settings.enhancedContrastMode,
                    regionColors: regionColors,
                    singleTapMode: settings.singleTapMode,
                    onCellToggle: {
                        // Auto-check solution after each move
                        autoCheckSolution()
                    },
                    onSaveUndo: {
                        saveStateForUndo()
                    }
                )
                .frame(width: UIScreen.main.bounds.width - 32, height: UIScreen.main.bounds.width - 32)
                .disabled(isCompleted)
                
                // Completion animation overlay
                if isCompleted {
                    VStack(spacing: 20) {
                        // "Congratulations!" message
                        Text("Congratulations!")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
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
                            .scaleEffect(showCongratulations ? 1.0 : 0.5)
                            .opacity(showCongratulations ? 0 : 1)
                        
                        // Time display with share button
                        HStack(spacing: 12) {
                            Text(formatTime(completionTime))
                                .font(.system(size: 32, weight: .semibold, design: .monospaced))
                                .foregroundColor(Color(red: 0.3, green: 0.35, blue: 0.5))
                            
                            // Share button - appears with time
                            if showCongratulations {
                                ShareLink(item: generateShareText(puzzle: puzzle, time: completionTime)) {
                                    Image(systemName: "square.and.arrow.up")
                                        .font(.system(size: 18, weight: .medium))
                                        .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                                        .frame(width: 28, height: 28)
                                }
                            }
                        }
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.white.opacity(0.9))
                                .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
                        )
                        .opacity(showCongratulations ? 1 : 0)
                    }
                    .padding()
                }
            }
            .frame(maxHeight: .infinity)
            
            Spacer()
            
            // Action buttons section
            VStack(spacing: 12) {
                // New Puzzle Button (primary action) - Only show for online mode
                if puzzleID == nil {
                    Button(action: {
                        Task {
                            await loadPuzzle()
                            resetGame()
                        }
                    }) {
                        Text("New Puzzle")
                            .font(.system(size: 18, weight: .medium, design: .rounded))
                            .foregroundColor(Color(red: 0.4, green: 0.5, blue: 0.7))
                            .frame(maxWidth: 280)
                            .padding(.vertical, 14)
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
                
                // Undo/Redo buttons (compact, side by side)
                HStack(spacing: 12) {
                    // Undo button
                    Button(action: {
                        performUndo()
                    }) {
                        HStack(spacing: 6) {
                            Image(systemName: "arrow.uturn.backward")
                                .font(.system(size: 16, weight: .medium))
                            Text("Undo")
                                .font(.system(size: 16, weight: .medium, design: .rounded))
                        }
                        .foregroundColor(undoStack.isEmpty ? Color(red: 0.7, green: 0.72, blue: 0.76) : Color(red: 0.5, green: 0.6, blue: 0.75))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(undoStack.isEmpty ? Color(red: 0.7, green: 0.72, blue: 0.76) : Color(red: 0.5, green: 0.6, blue: 0.75), lineWidth: 1.5)
                                .background(
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(Color.white.opacity(0.2))
                                )
                        )
                    }
                    .disabled(undoStack.isEmpty)
                    .opacity(undoStack.isEmpty ? 0.5 : 1.0)
                    
                    // Redo button
                    Button(action: {
                        performRedo()
                    }) {
                        HStack(spacing: 6) {
                            Text("Redo")
                                .font(.system(size: 16, weight: .medium, design: .rounded))
                            Image(systemName: "arrow.uturn.forward")
                                .font(.system(size: 16, weight: .medium))
                        }
                        .foregroundColor(redoStack.isEmpty ? Color(red: 0.7, green: 0.72, blue: 0.76) : Color(red: 0.5, green: 0.6, blue: 0.75))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(redoStack.isEmpty ? Color(red: 0.7, green: 0.72, blue: 0.76) : Color(red: 0.5, green: 0.6, blue: 0.75), lineWidth: 1.5)
                                .background(
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(Color.white.opacity(0.2))
                                )
                        )
                    }
                    .disabled(redoStack.isEmpty)
                    .opacity(redoStack.isEmpty ? 0.5 : 1.0)
                }
                .frame(maxWidth: 280)
                
                // Secondary actions (smaller, grouped)
                HStack(spacing: 12) {
                    // Reset Button
                    Button(action: {
                        resetCurrentPuzzle()
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 14, weight: .medium))
                            Text("Reset")
                                .font(.system(size: 15, weight: .medium, design: .rounded))
                        }
                        .foregroundColor(Color(red: 0.6, green: 0.62, blue: 0.68))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color(red: 0.6, green: 0.62, blue: 0.68), lineWidth: 1.5)
                                .background(
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(Color.white.opacity(0.15))
                                )
                        )
                    }
                }
                .frame(maxWidth: 280)
            }
            .padding(.horizontal)

            Spacer()
        }
        .overlay(alignment: .topTrailing) {
            if menuOpen {
                VStack(spacing: 0) {
                    menuRow(icon: "checkmark", label: "Validate") {
                        withAnimation(.spring(response: 0.28, dampingFraction: 0.72)) { menuOpen = false }
                        checkSolution()
                    }
                    Divider().padding(.horizontal, 12)
                    menuRow(icon: "plus", label: "Save Offline") {
                        withAnimation(.spring(response: 0.28, dampingFraction: 0.72)) { menuOpen = false }
                        savePuzzleToCache()
                    }
                    Divider().padding(.horizontal, 12)
                    menuRow(icon: "square.and.arrow.up", label: "Share") {
                        withAnimation(.spring(response: 0.28, dampingFraction: 0.72)) { menuOpen = false }
                        let text = generatePuzzleShareText(puzzle: puzzle)
                        let av = UIActivityViewController(activityItems: [text], applicationActivities: nil)
                        UIApplication.shared.connectedScenes
                            .compactMap { $0 as? UIWindowScene }
                            .first?.windows.first?.rootViewController?
                            .present(av, animated: true)
                    }
                }
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(.white)
                        .shadow(color: Color(red: 0.4, green: 0.5, blue: 0.7).opacity(0.15), radius: 16, x: 0, y: 4)
                )
                .frame(width: 160)
                .padding(.top, 62)
                .padding(.trailing, 16)
                .transition(.asymmetric(
                    insertion: .scale(scale: 0.88, anchor: .topTrailing).combined(with: .opacity),
                    removal:   .scale(scale: 0.88, anchor: .topTrailing).combined(with: .opacity)
                ))
                .zIndex(100)
            }
        }
        .onTapGesture {
            if menuOpen {
                withAnimation(.spring(response: 0.28, dampingFraction: 0.72)) { menuOpen = false }
            }
        }
    }

    private func loadPuzzle() async {
        logger.info("🎮 GameView: Starting puzzle load")
        isLoading = true
        loadingError = nil
        puzzle = nil
        stopTimer()
        
        // If we have a provided puzzle (offline mode), use it directly
        if let providedPuzzle = providedPuzzle {
            logger.info("🎮 GameView: Using provided puzzle (offline mode)")
            self.puzzle = providedPuzzle
            regionColors = RegionColorPalette.assignColors(for: providedPuzzle, enhancedContrast: settings.enhancedContrastMode)
            isLoading = false
            startTimer()
            return
        }

        // If we have a deep link code, fetch that specific puzzle
        if let code = deepLinkCode {
            logger.info("🎮 GameView: Fetching deep link puzzle \(code)")
            do {
                let loadedPuzzle = try await PuzzleFetcher.fetchPuzzleByCode(code)
                self.puzzle = loadedPuzzle
                regionColors = RegionColorPalette.assignColors(for: loadedPuzzle, enhancedContrast: settings.enhancedContrastMode)
                isLoading = false
                startTimer()
            } catch {
                loadingError = "Couldn't find puzzle #\(code)"
                isLoading = false
            }
            return
        }

        // Otherwise, fetch from API (online mode)
        do {
            logger.debug("🎮 GameView: Calling PuzzleFetcher...")
            let loadedPuzzle = try await PuzzleFetcher.fetchPuzzle(size: puzzleSize, starsPerUnit: starsPerUnit)
            
            logger.info("🎮 GameView: Puzzle loaded successfully")
            self.puzzle = loadedPuzzle
            // Generate and cache region colors
            regionColors = RegionColorPalette.assignColors(for: loadedPuzzle, enhancedContrast: settings.enhancedContrastMode)
            isLoading = false
            startTimer()
            
        } catch PuzzleFetchError.unauthenticated {
            logger.info("🎮 GameView: Unauthenticated — waiting for re-registration then retrying")
            try? await Task.sleep(for: .seconds(2))
            await loadPuzzle()
            return

        } catch let error as PuzzleFetchError {
            logger.error("🎮 GameView: PuzzleFetchError - \(error.localizedDescription)")
            loadingError = error.errorDescription ?? "Unknown error"
            
        } catch let error as Configuration.Error {
            logger.error("🎮 GameView: Configuration error - \(String(describing: error))")
            
            switch error {
            case .missingKey:
                loadingError = "Configuration error: Missing API key in Config.plist"
            case .invalidValue:
                loadingError = "Configuration error: Invalid value in Config.plist"
            case .configFileNotFound:
                loadingError = "Configuration error: Config.plist not found. Please add it to your project."
            case .configFileInvalid:
                loadingError = "Configuration error: Config.plist is invalid or corrupted"
            }
            
        } catch {
            logger.error("🎮 GameView: Unexpected error - \(error.localizedDescription)")
            loadingError = "Sorry, can't fetch a puzzle right now"
        }
        
        // Always set isLoading to false when we have an error
        if loadingError != nil {
            isLoading = false
        }
        
        logger.info("🎮 GameView: Load puzzle completed with status: \(self.puzzle != nil ? "success" : "failed")")
    }
    
    private func resetGame() {
        cellStates.removeAll()
        errorCells = []
        showingErrors = false
        isCompleted = false
        completionTime = 0
        showCongratulations = false
        elapsedTime = 0
        pausedTime = 0
        isSolutionVisible = false
        savedCellStates.removeAll()
        undoStack.removeAll()
        redoStack.removeAll()
        hasShownHintThisSession = false
        stopTimer()
        startTimer()
    }
    
    private func resetCurrentPuzzle() {
        // Clear all player input but keep the same puzzle
        cellStates.removeAll()
        errorCells = []
        showingErrors = false
        isCompleted = false
        completionTime = 0
        showCongratulations = false
        isSolutionVisible = false
        savedCellStates.removeAll()
        undoStack.removeAll()
        redoStack.removeAll()
        hasShownHintThisSession = false
        
        // Reset and restart the timer
        elapsedTime = 0
        pausedTime = 0
        stopTimer()
        startTimer()
    }
    
    private func performUndo() {
        guard !undoStack.isEmpty else { return }
        
        // Save current state to redo stack
        redoStack.append(cellStates)
        
        // Restore previous state
        withAnimation(.none) {
            cellStates = undoStack.removeLast()
        }
        
        // Clear any errors
        errorCells = []
        showingErrors = false
    }
    
    private func performRedo() {
        guard !redoStack.isEmpty else { return }
        
        // Save current state to undo stack
        undoStack.append(cellStates)
        
        // Restore next state
        withAnimation(.none) {
            cellStates = redoStack.removeLast()
        }
        
        // Clear any errors
        errorCells = []
        showingErrors = false
        
        // Auto-check solution after redo
        autoCheckSolution()
    }
    
    private func saveStateForUndo() {
        // Save current state before making a change
        undoStack.append(cellStates)
        
        // Clear redo stack when a new action is performed
        redoStack.removeAll()
        
        // Limit undo stack size to prevent memory issues
        if undoStack.count > 100 {
            undoStack.removeFirst()
        }
    }
    
    private func toggleSolution() {
        guard let puzzle = puzzle else { return }
        
        if isSolutionVisible {
            // Hide solution - restore previous state
            cellStates = savedCellStates
            savedCellStates.removeAll()
            isSolutionVisible = false
            
            // Restart timer if it was running
            if !isCompleted {
                startTimer()
            }
        } else {
            // Show solution - save current state first
            savedCellStates = cellStates
            cellStates.removeAll()
            
            // Place stars at solution positions
            for position in puzzle.solution {
                cellStates[position] = .star
            }
            
            // Stop the timer since solution is shown
            stopTimer()
            
            // Clear any errors
            errorCells = []
            showingErrors = false
            
            isSolutionVisible = true
        }
    }
    
    private func showSolution() {
        guard let puzzle = puzzle else { return }
        
        // Clear current state
        cellStates.removeAll()
        
        // Place stars at solution positions
        for position in puzzle.solution {
            cellStates[position] = .star
        }
        
        // Stop the timer since solution is shown
        stopTimer()
        
        // Clear any errors
        errorCells = []
        showingErrors = false
        
        // Don't mark as completed (since user didn't solve it)
        isCompleted = false
    }
    
    private func startTimer() {
        guard !isCompleted else { return }
        
        startTime = Date()
        var lastPulsedSecond = -1
        timer = Timer.scheduledTimer(withTimeInterval: 0.01, repeats: true) { _ in
            if let startTime = startTime, !isCompleted {
                elapsedTime = pausedTime + Date().timeIntervalSince(startTime)
                let currentSecond = Int(elapsedTime)
                if currentSecond != lastPulsedSecond {
                    lastPulsedSecond = currentSecond
                    timerPulse = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { timerPulse = false }
                }
            }
        }
    }
    
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
    
    private func pauseTimer() {
        guard let startTime = startTime, !isCompleted else { return }
        
        // Save current elapsed time before pausing
        pausedTime = pausedTime + Date().timeIntervalSince(startTime)
        elapsedTime = pausedTime
        
        // Stop the timer
        timer?.invalidate()
        timer = nil
        self.startTime = nil
    }
    
    private func resumeTimer() {
        guard !isCompleted, timer == nil else { return }
        
        // Restart timer from paused time
        startTimer()
    }
    
    private func handleScenePhaseChange(_ phase: ScenePhase) {
        switch phase {
        case .active:
            // App became active - resume timer if we have a puzzle and it's not completed
            if puzzle != nil && !isCompleted && timer == nil {
                resumeTimer()
            }
        case .inactive, .background:
            // App going to background or inactive - pause timer
            pauseTimer()
        @unknown default:
            break
        }
    }
    
    private func formatTime(_ timeInterval: TimeInterval) -> String {
        let minutes = Int(timeInterval) / 60
        let seconds = Int(timeInterval) % 60
        let centiseconds = Int((timeInterval.truncatingRemainder(dividingBy: 1)) * 100)
        return String(format: "%02d:%02d.%02d", minutes, seconds, centiseconds)
    }

    private func formatTimeLive(_ timeInterval: TimeInterval) -> String {
        let minutes = Int(timeInterval) / 60
        let seconds = Int(timeInterval) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
    
    /// Format time in a readable way for sharing (e.g., "2 minutes 34 seconds")
    private func formatTimeForSharing(_ timeInterval: TimeInterval) -> String {
        let totalSeconds = Int(timeInterval)
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        
        if minutes > 0 {
            if seconds > 0 {
                return "\(minutes) minute\(minutes == 1 ? "" : "s") \(seconds) second\(seconds == 1 ? "" : "s")"
            } else {
                return "\(minutes) minute\(minutes == 1 ? "" : "s")"
            }
        } else {
            return "\(seconds) second\(seconds == 1 ? "" : "s")"
        }
    }
    
    /// Generate share text with emojis and colored squares
    private func generateShareText(puzzle: StarBattlePuzzle, time: TimeInterval) -> String {
        let puzzleCode = puzzle.code ?? "Unknown"
        let timeString = formatTimeForSharing(time)
        let size = puzzle.size
        let stars = puzzle.starsPerRegion
        
        // Generate colored squares based on puzzle size
        let coloredSquares: String
        switch size {
        case 6:
            coloredSquares = "🟦🟨🟩"
        case 8:
            coloredSquares = "🟦🟨🟩🟪"
        case 10:
            coloredSquares = "🟦🟨🟩🟪🟥"
        default:
            coloredSquares = "🟦🟨🟩"
        }
        
        return """
        ✨ I solved Queens puzzle #\(puzzleCode) in \(timeString)! 🏆
        
        \(coloredSquares) \(size)×\(size) grid • \(stars) star\(stars == 1 ? "" : "s") per region ⭐️
        """
    }
    
    /// Generate share text + deep link for challenging a friend
    private func generatePuzzleShareText(puzzle: StarBattlePuzzle) -> String {
        let code = puzzle.code ?? "?"
        return "Try puzzle #\(code) on Queens! https://queens.knittedmice.com/puzzle?code=\(code)"
    }
    
    /// Save puzzle completion stats to cache (for offline puzzles)
    private func savePuzzleCompletion() {
        guard let puzzleID = puzzleID else {
            // This is an online puzzle, no need to save stats
            return
        }
        
        logger.info("📊 Puzzle \(puzzleID) completed in \(completionTime)s")
        
        // Update cache directly
        cache.updateCompletion(puzzleID: puzzleID, time: completionTime)
    }
    
    private func savePuzzleToCache() {
        guard let puzzle = puzzle else { return }
        
        // Check if puzzle is already in cache
        if cache.contains(puzzle) {
            saveMessage = "Puzzle already in cache"
            logger.info("⚠️ Puzzle already in cache")
        } else {
            // Try to add puzzle to cache
            let success = cache.add(puzzle)
            
            if success {
                saveMessage = "Puzzle saved to cache"
                logger.info("✅ Puzzle saved to cache successfully")
            } else {
                saveMessage = "Cache is full"
                logger.warning("⚠️ Failed to save puzzle (cache full)")
            }
        }
        
        // Show the message
        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
            showSaveMessage = true
        }
        
        // Hide the message after 2 seconds
        Task {
            try? await Task.sleep(for: .seconds(2))
            withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                showSaveMessage = false
            }
        }
    }
    
    private func checkSolution() {
        guard let puzzle = puzzle, !isCompleted else { return }
        
        // Extract cells with stars and marks
        let starPositions = cellStates.filter { $0.value == .star }.map { $0.key }
        let markedPositions = cellStates.filter { $0.value == .marked }.map { $0.key }
        let selectedCells = Set(starPositions)
        
        let result = PuzzleValidator.validate(stars: selectedCells, puzzle: puzzle)
        
        // Find all cells that have errors
        var errors = Set<GridPosition>()
        
        // Check if any stars are wrong (not in the correct solution)
        for star in starPositions {
            if !puzzle.solution.contains(star) {
                errors.insert(star)
            }
        }
        
        // Check if any X marks are blocking the correct solution
        for mark in markedPositions {
            if puzzle.solution.contains(mark) {
                errors.insert(mark)
            }
        }
        
        // Also check for constraint violations
        errors.formUnion(findErrorCells(puzzle: puzzle, selectedCells: selectedCells))
        
        switch result {
        case .valid:
            // Puzzle completed successfully!
            completionTime = elapsedTime
            stopTimer()
            isCompleted = true
            
            // Animate the completion
            Task {
                // Show "Congratulations!" popping up
                withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                    showCongratulations = false // Initially false means it's visible
                }
                
                // Wait 1.5 seconds
                try? await Task.sleep(for: .seconds(1.5))
                
                // Pop it back down and reveal time
                withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                    showCongratulations = true
                }
            }
            
        case .incomplete:
            if errors.isEmpty {
                withAnimation { showProgressToast = true }
                Task {
                    try? await Task.sleep(for: .seconds(1.8))
                    withAnimation { showProgressToast = false }
                }
            } else {
                flashErrors(errors)
            }

        case .invalid:
            flashErrors(errors)
        }
    }
    
    /// Auto-check solution after each move (silently, only triggers completion)
    private func autoCheckSolution() {
        guard let puzzle = puzzle, !isCompleted else { return }
        
        let starPositions = cellStates.filter { $0.value == .star }.map { $0.key }
        let selectedCells = Set(starPositions)
        
        let result = PuzzleValidator.validate(stars: selectedCells, puzzle: puzzle)
        
        if case .valid = result {
            // Puzzle completed successfully!
            completionTime = elapsedTime
            stopTimer()
            isCompleted = true
            
            // Update cache statistics if this was an offline puzzle
            savePuzzleCompletion()
            
            // Animate the completion
            Task {
                // Show "Congratulations!" popping up
                withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                    showCongratulations = false // Initially false means it's visible
                }
                
                // Wait 1.5 seconds
                try? await Task.sleep(for: .seconds(1.5))
                
                // Pop it back down and reveal time
                withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                    showCongratulations = true
                }
            }
        } else {
            // Check if we should show completion hint
            checkForCompletionHint()
        }
    }
    
    /// Check if we should show the completion hint
    private func checkForCompletionHint() {
        guard let puzzle = puzzle,
              !isCompleted,
              settings.showCompletionHints,
              !hasShownHintThisSession else {
            return
        }
        
        let starCount = cellStates.filter { $0.value == .star }.count
        let expectedStarCount = puzzle.size * puzzle.starsPerRegion
        
        // Condition 1: User placed exactly the expected number of stars
        let hasExpectedStars = starCount == expectedStarCount
        
        // Condition 2: Grid is completely filled (every cell has star or mark)
        let totalCells = puzzle.size * puzzle.size
        let filledCells = cellStates.count
        let isGridFilled = filledCells == totalCells
        
        if hasExpectedStars || isGridFilled {
            showCompletionHint = true
            hasShownHintThisSession = true
        }
    }
    
    private func findErrorCells(puzzle: StarBattlePuzzle, selectedCells: Set<GridPosition>) -> Set<GridPosition> {
        var errorCells = Set<GridPosition>()
        
        // Check for adjacent stars (both stars are errors)
        for star in selectedCells {
            let adjacentOffsets = [
                (-1, -1), (-1, 0), (-1, 1),
                (0, -1),           (0, 1),
                (1, -1),  (1, 0),  (1, 1)
            ]
            
            for (rowOffset, colOffset) in adjacentOffsets {
                let adjRow = star.row + rowOffset
                let adjCol = star.column + colOffset
                
                if adjRow >= 0 && adjRow < puzzle.size && adjCol >= 0 && adjCol < puzzle.size {
                    let adjPosition = GridPosition(row: adjRow, column: adjCol)
                    if selectedCells.contains(adjPosition) {
                        errorCells.insert(star)
                        errorCells.insert(adjPosition)
                    }
                }
            }
        }
        
        // Check for too many stars in a row
        var rowCounts: [Int: [GridPosition]] = [:]
        for star in selectedCells {
            rowCounts[star.row, default: []].append(star)
        }
        for (_, stars) in rowCounts where stars.count > puzzle.starsPerRegion {
            errorCells.formUnion(stars)
        }
        
        // Check for too many stars in a column
        var colCounts: [Int: [GridPosition]] = [:]
        for star in selectedCells {
            colCounts[star.column, default: []].append(star)
        }
        for (_, stars) in colCounts where stars.count > puzzle.starsPerRegion {
            errorCells.formUnion(stars)
        }
        
        // Check for too many stars in a region
        var regionCounts: [Int: [GridPosition]] = [:]
        for star in selectedCells {
            let regionId = puzzle.regions[star.row][star.column]
            regionCounts[regionId, default: []].append(star)
        }
        for (_, stars) in regionCounts where stars.count > puzzle.starsPerRegion {
            errorCells.formUnion(stars)
        }
        
        return errorCells
    }
    
    private func flashErrors(_ errors: Set<GridPosition>) {
        guard !errors.isEmpty else { return }
        
        // Show errors with animation
        errorCells = errors
        withAnimation(.easeInOut(duration: 0.3)) {
            showingErrors = true
        }
        
        // Hide errors after delay
        Task {
            try? await Task.sleep(for: .seconds(1.5))
            withAnimation(.easeOut(duration: 0.3)) {
                showingErrors = false
            }
            try? await Task.sleep(for: .seconds(0.3))
            errorCells = []
        }
    }
}

struct GameGridView: View {
    let puzzle: StarBattlePuzzle
    @Binding var cellStates: [GridPosition: CellState]
    let errorCells: Set<GridPosition>
    let showingErrors: Bool
    let conflictCells: Set<GridPosition>
    let showConflicts: Bool
    let enhancedContrast: Bool
    let regionColors: [Int: Color]
    let singleTapMode: Bool
    let onCellToggle: () -> Void
    let onSaveUndo: () -> Void
    
    var body: some View {
        GeometryReader { geometry in
            let maxGridSize: CGFloat = 750
            let gridSize = min(geometry.size.width, maxGridSize)
            let cellSize = gridSize / CGFloat(puzzle.size)
            let gridWidth = cellSize * CGFloat(puzzle.size)
            
            ZStack {
                // Cell backgrounds and content
                VStack(spacing: 0) {
                    ForEach(0..<puzzle.size, id: \.self) { row in
                        HStack(spacing: 0) {
                            ForEach(0..<puzzle.size, id: \.self) { column in
                                let position = GridPosition(row: row, column: column)
                                let regionId = puzzle.regionAt(row: row, column: column)
                                GameCellView(
                                    position: position,
                                    regionColor: regionColors[regionId] ?? Color.white,
                                    cellState: cellStates[position] ?? .empty,
                                    cellSize: cellSize,
                                    isError: errorCells.contains(position),
                                    showingErrors: showingErrors,
                                    isConflict: conflictCells.contains(position),
                                    showConflicts: showConflicts
                                ) {
                                    toggleCell(position: position)
                                }
                            }
                        }
                    }
                }
                .frame(width: gridWidth, height: gridWidth)
                
                // Draw thick region borders on top
                RegionBordersOverlay(puzzle: puzzle, cellSize: cellSize)
                    .frame(width: gridWidth, height: gridWidth)
                    .allowsHitTesting(false) // Allow touches to pass through to cells below
            }
            .background(Color.white.opacity(0.5))
            .clipShape(Rectangle())
            .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .aspectRatio(1, contentMode: .fit)
    }
    
    private func toggleCell(position: GridPosition) {
        let currentState = cellStates[position] ?? .empty
        
        // Save state for undo before making changes
        onSaveUndo()
        
        // Use withAnimation(.none) for instant, snappy transitions
        withAnimation(.none) {
            if singleTapMode {
                // Single tap mode: empty -> star -> empty (no X marks)
                switch currentState {
                case .empty:
                    cellStates[position] = .star
                case .star:
                    cellStates[position] = .empty
                case .marked:
                    // Shouldn't happen in single tap mode, but handle it
                    cellStates[position] = .star
                }
            } else {
                // Normal mode: empty -> marked -> star -> empty
                switch currentState {
                case .empty:
                    cellStates[position] = .marked
                case .marked:
                    cellStates[position] = .star
                case .star:
                    cellStates[position] = .empty
                }
            }
        }
        
        // Notify parent to check solution
        onCellToggle()
    }
}

struct RegionBordersOverlay: View {
    let puzzle: StarBattlePuzzle
    let cellSize: CGFloat
    
    var body: some View {
        Canvas { context, size in
            let borderColor = Color(red: 0.5, green: 0.55, blue: 0.65)
            let borderWidth: CGFloat = 3
            
            // Draw horizontal borders
            for row in 0..<puzzle.size {
                for col in 0..<puzzle.size {
                    let currentRegion = puzzle.regionAt(row: row, column: col)
                    
                    // Check top border
                    if row == 0 || puzzle.regionAt(row: row - 1, column: col) != currentRegion {
                        let x = CGFloat(col) * cellSize
                        let y = CGFloat(row) * cellSize
                        let path = Path { p in
                            p.move(to: CGPoint(x: x, y: y))
                            p.addLine(to: CGPoint(x: x + cellSize, y: y))
                        }
                        context.stroke(path, with: .color(borderColor), lineWidth: borderWidth)
                    }
                    
                    // Check bottom border
                    if row == puzzle.size - 1 || puzzle.regionAt(row: row + 1, column: col) != currentRegion {
                        let x = CGFloat(col) * cellSize
                        let y = CGFloat(row + 1) * cellSize
                        let path = Path { p in
                            p.move(to: CGPoint(x: x, y: y))
                            p.addLine(to: CGPoint(x: x + cellSize, y: y))
                        }
                        context.stroke(path, with: .color(borderColor), lineWidth: borderWidth)
                    }
                    
                    // Check left border
                    if col == 0 || puzzle.regionAt(row: row, column: col - 1) != currentRegion {
                        let x = CGFloat(col) * cellSize
                        let y = CGFloat(row) * cellSize
                        let path = Path { p in
                            p.move(to: CGPoint(x: x, y: y))
                            p.addLine(to: CGPoint(x: x, y: y + cellSize))
                        }
                        context.stroke(path, with: .color(borderColor), lineWidth: borderWidth)
                    }
                    
                    // Check right border
                    if col == puzzle.size - 1 || puzzle.regionAt(row: row, column: col + 1) != currentRegion {
                        let x = CGFloat(col + 1) * cellSize
                        let y = CGFloat(row) * cellSize
                        let path = Path { p in
                            p.move(to: CGPoint(x: x, y: y))
                            p.addLine(to: CGPoint(x: x, y: y + cellSize))
                        }
                        context.stroke(path, with: .color(borderColor), lineWidth: borderWidth)
                    }
                }
            }
        }
    }
}

struct GameCellView: View {
    let position: GridPosition
    let regionColor: Color
    let cellState: CellState
    let cellSize: CGFloat
    let isError: Bool
    let showingErrors: Bool
    let isConflict: Bool
    let showConflicts: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            ZStack {
                // Region background color
                Rectangle()
                    .fill(backgroundColor)
                    .frame(width: cellSize, height: cellSize)
                
                // Conflict overlay (live, persistent while conflict exists)
                if isConflict && showConflicts && !(isError && showingErrors) {
                    Rectangle()
                        .fill(Color(red: 0.92, green: 0.2, blue: 0.15).opacity(0.45))
                        .frame(width: cellSize, height: cellSize)
                }

                // Error glow overlay (takes precedence over conflict)
                if isError && showingErrors {
                    Rectangle()
                        .fill(Color.red.opacity(0.4))
                        .frame(width: cellSize, height: cellSize)
                }
                
                // Thin inner grid lines
                Rectangle()
                    .stroke(Color(red: 0.25, green: 0.27, blue: 0.29), lineWidth: 0.5)
                    .frame(width: cellSize, height: cellSize)
                
                // Display content based on state
                switch cellState {
                case .empty:
                    EmptyView()
                    
                case .marked:
                    // X mark
                    Image(systemName: "xmark")
                        .font(.system(size: cellSize * 0.4, weight: .medium))
                        .foregroundColor(iconColor)
                    
                case .star:
                    // Star
                    Image(systemName: "star.fill")
                        .font(.system(size: cellSize * 0.5))
                        .foregroundColor(iconColor)
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
        .transaction { transaction in
            transaction.animation = nil
        }
        .shadow(color: isError && showingErrors ? Color.red.opacity(0.6) : Color.clear, 
                radius: showingErrors ? 8 : 0)
        .animation(.easeInOut(duration: 0.3), value: showingErrors)
    }
    
    private var backgroundColor: Color {
        if isError && showingErrors {
            return Color.red.opacity(0.2)
        } else {
            return regionColor
        }
    }
    
    private var iconColor: Color {
        if isError && showingErrors {
            return Color.red.opacity(0.9)
        } else if isConflict && showConflicts && cellState == .star {
            return Color(red: 0.82, green: 0.1, blue: 0.08)
        } else if cellState == .star {
            return Color(red: 0.4, green: 0.5, blue: 0.7)
        } else {
            return Color(red: 0.6, green: 0.62, blue: 0.68)
        }
    }
}

#Preview {
    NavigationStack {
        GameView()
            .environment(AppSettings())
    }
}

