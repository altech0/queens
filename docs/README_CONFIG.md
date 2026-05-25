# Star Battle Puzzle App - Configuration

## Setting Up API Keys d

This app uses a backend API to fetch puzzles. You need to configure your API key before building the app.

### Setup Instructions

1. **Copy the template file:**
   ```bash
   cp Config.plist.template Config.plist
   ```

2. **Edit `Config.plist`:**
   - Open `Config.plist` in Xcode or a text editor
   - Replace `YOUR_API_KEY_HERE` with your actual API key

3. **Add to Xcode:**
   - Make sure `Config.plist` is added to your Xcode project
   - Verify it's included in the target's "Copy Bundle Resources" build phase

### Configuration Values

The `Config.plist` file should contain:

- **PUZZLE_API_KEY**: Your API key for authenticating with the puzzle service
- **PUZZLE_API_URL**: The API endpoint (default: `https://queens-api.gelatos-league-4h.workers.dev/puzzle`)

### Security Notes

⚠️ **Important**: `Config.plist` is excluded from version control via `.gitignore`

- Never commit `Config.plist` with real API keys
- Use `Config.plist.template` for sharing the project structure
- Each developer needs their own `Config.plist` file

### Alternative Approaches

If you need different configuration for different environments (dev, staging, production), consider:

1. **Using .xcconfig files** with build configurations
2. **Environment variables** in your build scheme
3. **Xcode build settings** with user-defined settings

## API Response Format

The API returns JSON in this format:

```json
{
  "id": "afe3e8cf-e4ba-4718-8c4d-c771638dcf75",
  "size": 6,
  "regions": [
    [0, 0, 3, 1, 1, 1],
    [3, 3, 3, 2, 2, 1],
    [3, 3, 3, 2, 2, 2],
    [3, 3, 3, 2, 2, 2],
    [3, 4, 4, 2, 2, 2],
    [3, 3, 3, 3, 5, 2]
  ],
  "solution": [1, 5, 3, 0, 2, 4],
  "createdAt": "2026-03-25T17:18:31.232Z"
}
```

### Field Descriptions

- **id**: Unique identifier for the puzzle (UUID)
- **size**: Size of the grid (e.g., 6 for a 6×6 grid)
- **regions**: 2D array where each cell contains a region ID (0-based)
- **solution**: Array of column indices, one per row
  - Index in array = row number
  - Value at that index = column number
  - Example: `[1, 5, 3, 0, 2, 4]` means:
    - Row 0, Column 1
    - Row 1, Column 5
    - Row 2, Column 3
    - Row 3, Column 0
    - Row 4, Column 2
    - Row 5, Column 4
- **createdAt**: ISO 8601 timestamp when the puzzle was created

### Internal Conversion
The app automatically converts this format to its internal representation:

```swift
// API format
"solution": [1, 5, 3, 0, 2, 4]

// Converted to internal format
solution: Set<GridPosition> = [
  GridPosition(row: 0, column: 1),
  GridPosition(row: 1, column: 5),
  GridPosition(row: 2, column: 3),
  GridPosition(row: 3, column: 0),
  GridPosition(row: 4, column: 2),
  GridPosition(row: 5, column: 4)
]
```

