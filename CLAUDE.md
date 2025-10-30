# Read Later Random - Project Reference

## Project Overview
Browser extension + web dashboard for saving links and retrieving them randomly. Users can save links via extension, then visit the website to get a random link from their queue.

## Architecture

### Two-Part System
1. **Extension** (`/extension/`) - Browser extension (Chrome/Firefox, Manifest V3)
   - **Requires authentication** - Cannot save or view links without signing in
   - All link data stored in Firestore
2. **Website** (`/website/`) - React dashboard for viewing/managing saved links
   - Currently just handles authentication handoff
   - Dashboard UI not yet implemented

### Tech Stack
- **Frontend**: React 19 + Vite 7 + Tailwind CSS 4
- **Backend**: Firebase 12 (Auth + Firestore)
- **Extension**: Manifest V3, service worker architecture

### Authentication Requirement
**IMPORTANT:** The extension is fully cloud-based and requires Google authentication to function. Without signing in:
- Cannot save links
- Cannot view saved links
- Extension popup shows "Sign in with Google" button
- All link data is stored per-user in Firestore `users/{userId}/links`

## Key Files & Their Purposes

### Extension (`/extension/src/`)
- `background.js` - Service worker: handles auth state, saves links to Firestore
- `popup.js` - Extension popup UI: loads/saves/deletes links from Firestore
- `content.js` - Injected into Reddit/YouTube: intercepts clicks when productivity mode enabled
- `auth-bridge.js` - Content script for auth communication with website
- `firebase-config.js` - Firebase configuration and helpers
- `manifest.json` - Extension manifest (Manifest V3)
- `popup.html` - Popup UI structure

### Website (`/website/src/`)
- `App.jsx` - Main app component with routing
- `components/StorageChoiceScreen.jsx` - Landing page, handles auth + extension sync
- `components/DashboardScreen.jsx` - Dashboard (placeholder - not yet implemented)
- `lib/firebase-config.js` - Firebase configuration
- `lib/auth.js` - Google OAuth authentication

## Critical URLs

### Production
- **Website**: `https://484-final-project-three.vercel.app/`
- **OAuth Callback**: `https://484-final-project-three.vercel.app/`

### Development
- **Website (local)**: `http://localhost:5173/`

### Where URLs Are Hardcoded
- `/extension/src/background.js` - WEBSITE_URL
- `/extension/src/popup.js` - AUTH_URL
- `/extension/src/auth-bridge.js` - allowedOrigins array
- `/extension/manifest.json` - Content script matches for auth-bridge

**To switch between dev/production:** Manually change these URLs in the source files

## Authentication Flow

1. User clicks "Sign in" in extension popup
2. Extension opens website in new tab (via chrome.tabs.create)
3. Website performs Google OAuth via Firebase
4. Website sends auth token via postMessage (to window.location.origin, not wildcard)
5. auth-bridge.js (content script) receives message, validates origin
6. auth-bridge forwards to background.js via chrome.runtime.sendMessage
7. background.js stores auth state in chrome.storage.local
8. Extension popup detects auth change, loads queue from Firestore
9. Extension popup now shows authenticated UI with user's saved links

## Firebase Configuration

### Shared Firebase Project
- Project ID: `cs484-extension-493e5`
- API Key: `AIzaSyAG5sAYJWlPxbPWBt4F4Hn5P9O-DJZzGOA`
- Auth Domain: `cs484-extension-493e5.firebaseapp.com`

### Storage Locations

**IMPORTANT: Extension requires authentication to save/view links**

#### Firestore Collections (Primary Data Storage)
- `users/{userId}/links` - All saved links (used by extension and website)
  - Document fields: `url`, `title`, `timestamp`, `createdAt`
  - Extension reads/writes directly to Firestore
  - Website will read from this collection (not yet implemented)

#### chrome.storage.local (Auth Data Only)
- `user` - User object (uid, email, displayName, photoURL)
- `authToken` - Firebase ID token
- `authTimestamp` - When auth was completed
- `productivityMode` - Boolean toggle for auto-intercept feature

**Note:** Links/queue are NOT stored in chrome.storage.local - everything is in Firestore

## Build & Development

### Extension
```bash
cd extension
npm install
npm run build        # Builds src files to /dist/ (background.js, popup.js, content.js, auth-bridge.js)
npm run copy-files   # Copies manifest.json and popup.html to /dist/
```

**What gets built:**
- Vite bundles all `/src/*.js` files into `/dist/*.js` with Firebase dependencies
- manifest.json and popup.html copied as-is
- Final `/dist/` folder is what you load into the browser

### Website
```bash
cd website
npm install
npm run dev          # Starts dev server on http://localhost:5173
npm run build        # Builds for production
```

## Current Status & TODOs

### ✅ Completed
- Firestore integration fully implemented in extension
- Security: postMessage uses specific origins (window.location.origin)
- Cleaned up outdated root-level files
- All link operations use Firestore exclusively
- Version synced to 1.0.0 across project

### 🚧 Not Yet Implemented
- **Website Dashboard**: Currently just a placeholder
  - Need to implement link viewing/management UI
  - Should read from Firestore `users/{userId}/links` collection
  - Could reuse extension's Firestore queries

## Common Tasks

### Testing Extension Locally
1. Build extension: `cd extension && npm run build && npm run copy-files`
2. Chrome: Load unpacked from `extension/dist/`
3. Firefox: Load temporary from `extension/dist/`

### Deploying Website
- Vercel auto-deploys from main branch
- Build command: `cd website && npm run build`
- Output: `website/dist/`

## Important Patterns

### Extension-Website Communication
- Uses window.postMessage for auth handoff
- auth-bridge.js validates allowed origins before forwarding
- Background script listens via chrome.runtime.onMessage

### Link Storage Model (Firestore Document)
```javascript
{
  url: string,         // The saved URL
  title: string,       // Page title or URL if no title
  timestamp: number,   // Date.now() when saved
  createdAt: number    // Date.now() when created
}
```

**Note:** Document ID is auto-generated by Firestore and used as the link ID

## Data Flow

### Saving a Link
1. User clicks link on Reddit/YouTube OR clicks "Save Current Page"
2. Extension checks authentication
3. Checks for duplicates in Firestore (`where('url', '==', url)`)
4. If unique, saves to `users/{userId}/links` collection
5. Updates local queue array for immediate UI feedback

### Loading Links
1. Extension popup opens
2. Checks for authenticated user in chrome.storage.local
3. If authenticated, queries Firestore for all links in `users/{userId}/links`
4. Populates local queue array
5. Displays random link from queue

### Deleting a Link
1. User clicks "Delete" or "Open & Remove"
2. Deletes document from Firestore using document ID
3. Removes from local queue array
4. Updates UI to show next random link

## Productivity Mode

**What it does:** Prevents impulsive link clicking on Reddit and YouTube by intercepting clicks and saving links for later instead.

**Toggle behavior:**
- **ON**: Content script intercepts clicks on Reddit/YouTube and auto-saves links
  - Intercepts YouTube video links (`youtube.com/watch`)
  - Intercepts Reddit post/comment links (`reddit.com/r/.../comments/...`)
  - Prevents navigation and saves to Firestore automatically
  - Shows "Saved for later!" notification
- **OFF**: Normal browsing - no link interception
  - User can still manually save links via extension popup
  - Content script still loaded but doesn't intercept clicks

**Storage:** Productivity mode preference stored in `chrome.storage.local.productivityMode`

## Version Information
- Website: 1.0.0
- Extension: 1.0.0
- Node: 18+ recommended
- Browsers: Chrome 88+, Firefox 109+ (Manifest V3 support)
