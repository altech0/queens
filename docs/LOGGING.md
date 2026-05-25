# Logging Quick Reference

## What's Being Logged

The app now logs everything happening during API calls and configuration loading:

### 1. Configuration Loading (Configuration.swift)
```
🔍 Looking for configuration key: PUZZLE_API_KEY
✅ Found Config.plist at path: /path/to/Config.plist
✅ Successfully loaded Config.plist dictionary with 2 keys
📋 Available keys in Config.plist: [PUZZLE_API_KEY, PUZZLE_API_URL]
🔑 API Key loaded (length: 32 characters)
🌐 API URL: https://queens-api.gelatos-league-4h.workers.dev/puzzle
```

### 2. API Request (PuzzleFetcher.swift)
```
🎯 Starting puzzle fetch process
📝 Loading configuration...
✅ Configuration loaded successfully
🌐 Preparing request to: https://queens-api.gelatos-league-4h.workers.dev/puzzle
📤 Request details:
  - URL: https://queens-api.gelatos-league-4h.workers.dev/puzzle
  - Method: GET
  - Headers: X-API-Key set (length: 32)
  - Timeout: 30s
⏳ Sending request...
```

### 3. API Response (PuzzleFetcher.swift)
```
✅ Received response (1234 bytes)
📥 HTTP Response:
  - Status code: 200
  - Headers: [Content-Type: application/json, ...]
✅ HTTP 200 OK - decoding response...
📄 Raw JSON response:
{"id":"afe3e8cf-e4ba-4718-8c4d-c771638dcf75","size":6,"regions":[[0,0,3,1,1,1],...]}
✅ Successfully decoded API response
📋 API Response:
  - ID: afe3e8cf-e4ba-4718-8c4d-c771638dcf75
  - Size: 6
  - Solution array: [1, 5, 3, 0, 2, 4]
🔄 Converting API format to internal format...
🎉 Puzzle fetched successfully!
📊 Puzzle details:
  - Size: 6x6
  - Stars per region: 1
  - Solution positions: 6
  - Solution: [GridPosition(row: 0, column: 1), GridPosition(row: 1, column: 5), ...]
```

### 4. Game View Updates (GameView.swift)
```
🎮 GameView: Starting puzzle load
🎮 GameView: Calling PuzzleFetcher...
🎮 GameView: Puzzle loaded successfully
🎮 GameView: Load puzzle completed with status: success
```

## How to View Logs

### In Xcode Console (Easiest)

1. Run your app from Xcode (⌘R)
2. Open Debug Console: `⌘⇧Y`
3. Type filter terms: `Configuration`, `PuzzleFetcher`, or `GameView`

### In Console.app (More Detailed)

1. Open **Console.app** (Spotlight: ⌘Space, type "Console")
2. Select your device/simulator in left sidebar
3. Start filtering:
   - Click "Start" button to begin streaming
   - In search box, type: `subsystem:com.app.queens`
4. Watch logs appear in real-time

### Filter Examples

| Want to see... | Type this in Console.app |
|---------------|-------------------------|
| All app logs | `subsystem:com.app.queens` |
| Just configuration | `category:Configuration` |
| Just API calls | `category:PuzzleFetcher` |
| Just game events | `category:GameView` |
| Errors only | `subsystem:com.app.queens type:error` |
| Warnings & errors | `subsystem:com.app.queens (type:error OR type:fault)` |

## Common Errors You'll See

### ❌ Config.plist file not found
**What it means:** The Config.plist file isn't in your app bundle  
**Fix:** Add Config.plist to Xcode and ensure it's in "Copy Bundle Resources"

### ⚠️ API Key is still set to template value
**What it means:** You forgot to edit Config.plist  
**Fix:** Open Config.plist and replace `YOUR_API_KEY_HERE` with your real key

### ❌ HTTP error - status code: 401
**What it means:** Your API key is invalid or missing permissions  
**Fix:** Check your API key is correct and has proper access

### ❌ Failed to decode JSON
**What it means:** The API response doesn't match expected format  
**Fix:** Check the Raw JSON in logs and compare to expected format

### ❌ Network request failed
**What it means:** No internet connection or API is unreachable  
**Fix:** Check internet connection and API URL

## Log Levels

The app uses different log levels:

- **Debug** (🔍) - Detailed information for debugging
- **Info** (ℹ️) - General information messages  
- **Error** (❌) - Something went wrong
- **Fault** (💥) - Critical errors (shouldn't happen)

In production builds, only Error and Fault logs are shown to users.
In debug builds (Xcode), you see all logs.
