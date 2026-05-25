# Deep Linking Implementation

## Overview
Queens now supports deep linking, allowing users to share puzzles that can be opened directly in the app!

## How It Works

### Sharing a Puzzle
When a user completes a puzzle and shares it, the message includes:
```
✨ I solved Queens puzzle #1234 in 2 minutes 34 seconds! 🏆

🟦🟨🟩 6×6 grid • 1 star per region ⭐️

Play it here: queens://puzzle/1234
```

### Opening a Shared Puzzle
1. User clicks `queens://puzzle/1234` link
2. iOS opens Queens app (if installed)
3. App fetches puzzle #1234 from the API
4. GameView loads with that specific puzzle
5. User can play the same puzzle!

## Setup Required in Xcode

### 1. Add URL Scheme
1. Open the project in Xcode
2. Select the **queens** target
3. Go to the **Info** tab
4. Expand **URL Types**
5. Click **+** to add a new URL Type
6. Set:
   - **Identifier**: `com.yourcompany.queens`
   - **URL Schemes**: `queens`
   - **Role**: Editor

### 2. Update App Store URL (When Published)
In `DeepLinkPuzzleView.swift`, replace the placeholder:

```swift
private func openAppStore() {
    // Replace with actual App Store URL
    let appStoreURL = URL(string: "https://apps.apple.com/app/idYOUR_APP_ID")!
    openURL(appStoreURL)
}
```

## Files Modified
- `GameView.swift` - Added deep link URL to share message
- `queensApp.swift` - Added URL handling with `onOpenURL`
- `ContentView.swift` - Added notification listener and navigation
- `DeepLinkPuzzleView.swift` - New view to handle deep link loading
- `PuzzleFetcher.swift` - Added `fetchPuzzleByCode()` method

## Testing Deep Links

### In Simulator/Device:
1. Build and run the app
2. Open Safari (or Notes app)
3. Type: `queens://puzzle/1234`
4. Tap the link
5. App should open and load puzzle #1234

### Via Terminal:
```bash
xcrun simctl openurl booted "queens://puzzle/1234"
```

## Future Enhancements
- Add universal links support (requires domain)
- Show challenge comparison (your time vs friend's time)
- Add social metadata for better link previews
