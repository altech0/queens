//
//  HowToPlayView.swift
//  queens
//
//  Created by Alex on 06/04/2026.
//

import SwiftUI

private struct Slide: Identifiable {
    let id: Int
    var image: String? = nil
    let title: String
    let body: String
}

// ─── Add / remove slides here ────────────────────────────────────────────────
private let slides: [Slide] = [
    Slide(id: 0,  image: "htp_s1",  title: "Slide 1",  body: "The goal of Queens is simple — place one star in every row, column, and coloured region."),
    Slide(id: 1,  image: "htp_s2",  title: "Slide 2",  body: "See the highlighted row? It has exactly one star — that's the rule!"),
    Slide(id: 2,  image: "htp_s3",  title: "Slide 3",  body: "Same goes for every column..."),
    Slide(id: 3,  image: "htp_s4",  title: "Slide 4",  body: "...and every coloured region. One star each, no exceptions. (In two-star puzzles it's two — but let's not get ahead of ourselves.)"),
    Slide(id: 4,  image: "htp_s5",  title: "Slide 5",  body: "Stars can't touch each other, even diagonally. Place a star and every crossed cell is off-limits for another one."),
    Slide(id: 5,  image: "htp_s6",  title: "Slide 6",  body: "In a one-star puzzle that wipes out the entire row and column too. Crosses are your best friend — use them to eliminate where stars can't go!"),
    Slide(id: 6,  image: "htp_s7",  title: "Slide 7",  body: "Ready to solve one? The red region only appears in the first column — that's your starting point."),
    Slide(id: 7,  image: "htp_s8",  title: "Slide 8",  body: "That means everything else in column one is out, and so are the two cells sitting right next to the red region — a star there would block it completely."),
    Slide(id: 8,  image: "htp_s9",  title: "Slide 9",  body: "With all that crossed out, only one cell in the upper-left region is still free. A star has to go there!"),
    Slide(id: 9,  image: "htp_s10", title: "Slide 10", body: "Cross out its row, column, and neighbours — the usual drill."),
    Slide(id: 10, image: "htp_s11", title: "Slide 11", body: "And just like that, only one cell is left open in the blue region. Easy!"),
    Slide(id: 11, image: "htp_s12", title: "Slide 12", body: "Mark the forbidden cells and keep going."),
    Slide(id: 12, image: "htp_s13", title: "Slide 13", body: "Here's where it gets fun. All the valid cells in the purple region fall on the same row — which means the yellow cell in that row definitely can't be a star. Cross it out!"),
    Slide(id: 13, image: "htp_s14", title: "Slide 14", body: "Look at the row below — only the yellow region can put a star there. So the bottom three yellow cells can go, since a star there would leave that row starless."),
    Slide(id: 14, image: "htp_s15", title: "Slide 15", body: "All that thinking pays off — there's only one place in that column a star can go."),
    Slide(id: 15, image: "htp_s16", title: "Slide 16", body: "Cross out the neighbours..."),
    Slide(id: 16, image: "htp_s17", title: "Slide 17", body: "...and the purple region has only one free cell left. Ta-da!"),
    Slide(id: 17, image: "htp_s18", title: "Slide 18", body: "Keep filling in the crosses and the last star falls right into place."),
    Slide(id: 18, image: "htp_s19", title: "Slide 19", body: "Place the green star..."),
    Slide(id: 19, image: "htp_s20", title: "Slide 20", body: "Solved! You're ready to play."),
]
// ─────────────────────────────────────────────────────────────────────────────

struct HowToPlayView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @State private var currentIndex = 0

    private var dotIndices: [Int] {
        let last = slides.count - 1
        let lo = max(0, min(currentIndex - 1, last - 2))
        return [lo, lo + 1, lo + 2]
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            ZStack {
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(AppColors.primary(colorScheme))
                            .frame(width: 44, height: 44)
                    }
                    Spacer()
                }
                Text("How to play")
                    .font(.system(size: 17, weight: .semibold, design: .rounded))
                    .foregroundColor(AppColors.textPrimary(colorScheme))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            Divider()

            // Carousel
            TabView(selection: $currentIndex) {
                ForEach(slides) { slide in
                    SlideView(slide: slide)
                        .tag(slide.id)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            Divider()

            // Dot indicators — sliding window of 3 around current
            HStack(spacing: 6) {
                ForEach(dotIndices, id: \.self) { index in
                    Capsule()
                        .fill(index == currentIndex
                              ? AppColors.primary(colorScheme)
                              : Color(white: 0.75))
                        .frame(width: index == currentIndex ? 20 : 6, height: 6)
                        .animation(.easeInOut(duration: 0.2), value: currentIndex)
                }
            }
            .padding(.vertical, 14)
        }
        .background(AppColors.backgroundGradient(colorScheme).ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
    }
}

private struct SlideView: View {
    let slide: Slide
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: 0) {
            // Image area
            Group {
                if let imageName = slide.image {
                    Image(imageName)
                        .resizable()
                        .scaledToFit()
                } else {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(.secondarySystemBackground))
                        .overlay(
                            Text("Image")
                                .font(.system(size: 15, weight: .medium, design: .rounded))
                                .foregroundColor(Color(.tertiaryLabel))
                        )
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 28)

            // Text — split on sentence endings so each sentence is its own line
            Text(slide.body.sentenceLines)
                .font(.system(size: 17, weight: .medium, design: .rounded))
                .foregroundColor(AppColors.textPrimary(colorScheme))
                .lineSpacing(4)
                .minimumScaleFactor(0.75)
                .padding(.horizontal, 20)
                .frame(maxWidth: .infinity, alignment: .leading)

            Spacer(minLength: 20)
        }
    }
}

private extension String {
    var sentenceLines: String {
        // Split on sentence-ending punctuation followed by a space or end of string
        let pattern = #"([.!?])(?=\s|$)"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return self }
        let range = NSRange(startIndex..., in: self)
        let spaced = regex.stringByReplacingMatches(in: self, range: range, withTemplate: "$1\n")
        return spaced
            .components(separatedBy: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .joined(separator: "\n")
    }
}

#Preview {
    NavigationStack {
        HowToPlayView()
            .environment(AppSettings())
    }
}
