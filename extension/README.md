# Read Later Random - Browser Extension

A browser extension that helps you save links for later and view them randomly one at a time.

## Development Setup

### Prerequisites
- Node.js (v18 or higher)
- npm

### Install Dependencies
```bash
npm install
```

### Build Extension
```bash
npm run build
```

This will:
1. Bundle the source files from `/src` using Vite
2. Output bundled files to `/dist`
3. Copy static files (manifest.json, popup.html, models.js) to `/dist`

### Development Mode
For auto-rebuilding on file changes:
```bash
npm run dev
```

## Loading Extension in Browser

### Chrome
1. Go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `/dist` folder

### Firefox
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `/dist/manifest.json`

## Architecture

### Auth Flow
1. **Extension Install**: Opens website automatically for first-time setup
2. **Website Auth**: User signs in with Google OAuth on website
3. **Token Transfer**: Website sends auth token to extension via `chrome.runtime.sendMessage`
4. **Storage**: Extension stores token + user info in `chrome.storage.local`
5. **Firebase Access**: Both extension and website use Firebase SDK to read/write Firestore

### File Structure
```
extension/
├── src/
│   ├── background.js      # Service worker (handles messages, Firebase ops)
│   ├── popup.js           # Extension popup UI logic
│   ├── content.js         # Content script (runs on YouTube/Reddit)
│   └── firebase-config.js # Firebase initialization & helpers
├── dist/                  # Built extension (load this in browser)
├── manifest.json          # Extension configuration
├── popup.html             # Popup UI
├── models.js              # Data models
├── package.json           # Dependencies
└── vite.config.js         # Build configuration
```

### Firebase Integration
- Website handles OAuth (Google sign-in)
- Extension receives auth token from website
- Both use same Firebase project
- Extension makes Firestore queries filtered by user ID
- No Firebase Auth needed in extension (uses token from website)

## Configuration

### Update URLs for Production
When deploying, update these files:

**src/background.js:**
```javascript
const WEBSITE_URL = 'https://your-deployed-site.com/';
```

**src/popup.js:**
```javascript
const AUTH_URL = 'https://your-deployed-site.com/';
```

**manifest.json:**
```json
"externally_connectable": {
  "matches": [
    "https://your-deployed-site.com/*"
  ]
}
```

## Features
- 📚 Save links from YouTube and Reddit
- 🎲 View saved links randomly
- 🔒 Google OAuth authentication
- ☁️ Cloud sync via Firebase Firestore
- 🌐 Cross-browser support (Chrome & Firefox)

## Manifest Version
Uses Manifest V3 for Chrome compatibility.
