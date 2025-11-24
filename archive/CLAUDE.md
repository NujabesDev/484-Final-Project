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
- `background.js` - Service worker: Firebase initialization, auth handling, message handlers, cache management, Firestore operations
- `popup.js` - Extension popup UI: sends messages to background for all data operations
- `auth-bridge.js` - Content script for auth communication with website
- `services/firestore.js` - Firestore CRUD operations (used by background.js)
- `config.js` - Centralized URL configuration
- `manifest.json` - Extension manifest (Manifest V3)
- `popup.html` - Popup UI structure
- `popup.css` - Tailwind-based styles

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
7. background.js signs into Firebase with token (Firebase persists session to IndexedDB)
8. When popup reopens, Firebase Auth automatically restores session from IndexedDB
9. Extension popup shows authenticated UI with user's saved links from Firestore

**Key:** Firebase Auth handles all token persistence and refresh automatically via IndexedDB. No manual token storage needed.

## Firebase Configuration

### Shared Firebase Project
- Project ID: `cs484-extension-493e5`
- API Key: `AIzaSyAG5sAYJWlPxbPWBt4F4Hn5P9O-DJZzGOA`
- Auth Domain: `cs484-extension-493e5.firebaseapp.com`

### Storage Locations

**IMPORTANT: Extension requires authentication to save/view links**

#### Firestore Collections (Primary Data Storage)
- `users/{userId}/links` - All saved links (used by extension and website)
  - Document fields: `url`, `title`, `createdAt`
  - Extension reads/writes directly to Firestore
  - Website will read from this collection (not yet implemented)

#### chrome.storage.local (Cache Only - Real-Time Sync)
- `cachedQueue` - Cached copy of links array for instant popup UI

**Note:**
- Links are stored in Firestore (single source of truth)
- Auth is handled by Firebase Auth with IndexedDB persistence (no manual token storage)
- Cache is managed by background.js with **real-time sync via Firestore onSnapshot**
- Cache is **always fresh** - automatically updates when Firestore changes
- Popup loads instantly from cache (no query needed!)
- Perfect for multi-device sync and dashboard deletions

## Build & Development

### Prerequisites
- Node.js v18 or higher
- npm

### Extension
```bash
cd extension
npm install
npm run build        # Builds src files to /dist/ (background.js, popup.js, content.js, auth-bridge.js)
npm run copy-files   # Copies manifest.json and popup.html to /dist/
```

**Development mode** (auto-rebuild on file changes):
```bash
npm run dev
```

**What gets built:**
- Vite bundles all `/src/*.js` files into `/dist/*.js` with Firebase dependencies
- manifest.json and popup.html copied as-is
- Final `/dist/` folder is what you load into the browser

### Extension File Structure
```
extension/
├── src/
│   ├── background.js          # Service worker (message handlers, Firebase ops, cache)
│   ├── popup.js               # Extension popup UI (message passing only)
│   ├── auth-bridge.js         # Auth communication with website
│   ├── config.js              # URL configuration
│   └── services/firestore.js  # Firestore CRUD operations (used by background)
├── dist/                      # Built extension (load this in browser)
├── manifest.json              # Extension configuration
├── popup.html                 # Popup UI
├── popup.css                  # Tailwind-based styles
├── package.json               # Dependencies
└── vite.config.js             # Build configuration
```

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
- **Refactored to standard Manifest V3 message passing architecture**
  - Single Firebase instance in background.js only
  - popup.js uses message passing (no direct Firebase imports)
  - Cleaner separation of concerns
- **Real-time sync via Firestore onSnapshot listener**
  - Cache automatically updates when Firestore changes
  - Perfect for dashboard deletions and multi-device sync
  - No TTL polling - always fresh data with instant popup loads
  - Listener lifecycle managed automatically (starts on sign in, stops on sign out)

### 🚧 Not Yet Implemented
- **Website Dashboard**: Currently just a placeholder
  - Need to implement link viewing/management UI
  - Should read from Firestore `users/{userId}/links` collection
  - Could reuse extension's Firestore queries

## Common Tasks

### Testing Extension Locally
1. Build extension: `cd extension && npm run build && npm run copy-files`

2. **Chrome:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" toggle (top right)
   - Click "Load unpacked"
   - Select the `extension/dist/` folder

3. **Firefox:**
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `extension/dist/manifest.json`

### Deploying Website
- Vercel auto-deploys from main branch
- Build command: `cd website && npm run build`
- Output: `website/dist/`

## Important Patterns

### Extension Architecture: Message Passing + Real-Time Sync

**Key principle:** popup.js communicates with background.js via `chrome.runtime.sendMessage` - NO direct Firebase imports.

**Background.js responsibilities:**
- Single Firebase instance (auth + Firestore)
- **Real-time sync via Firestore `onSnapshot` listener**
- All data operations (load/save/delete links)
- Automatic cache updates when Firestore changes
- Message handler for all actions

**Popup.js responsibilities:**
- UI rendering only
- Sends messages to background for data
- Maintains local `queue` array for display
- No Firebase dependencies

**Message types:**
- `GET_AUTH_STATE` - Returns current user
- `GET_LINKS` - Returns links (always fresh from real-time cache!)
- `SYNC_LINKS` - Manual refresh (rarely needed - real-time sync handles it)
- `SAVE_LINK` - Saves link + updates cache
- `DELETE_LINK` - Deletes link + updates cache

**Real-Time Sync Flow:**
1. User signs in → background.js starts `onSnapshot` listener
2. Any Firestore change (dashboard, other device, etc.) → listener fires
3. Listener automatically updates cache
4. Popup always shows fresh data (instant!)
5. User signs out → listener stops

**Benefits:**
- ✅ Single Firebase instance (service worker only)
- ✅ Standard MV3 pattern (maintainable, debuggable)
- ✅ **Real-time sync** - dashboard changes appear instantly!
- ✅ **Perfect multi-device sync** - devices auto-update
- ✅ Cache always fresh (no TTL polling needed)
- ✅ Fewer Firestore queries (listener is more efficient)
- ✅ Clear separation of concerns

### Extension-Website Communication
- Uses window.postMessage for auth handoff
- auth-bridge.js validates allowed origins before forwarding
- Background script listens via chrome.runtime.onMessage

### Link Storage Model (Firestore Document)
```javascript
{
  url: string,         // The saved URL
  title: string,       // Page title or URL if no title
  createdAt: number    // Date.now() when created
}
```

**Note:** Document ID is auto-generated by Firestore and used as the link ID

## Data Flow (Real-Time Sync Architecture)

### Saving a Link
1. User clicks "Save Current Page" in popup
2. **popup.js**: Sends `SAVE_LINK` message to background with {url, title}
3. **background.js**: Receives message, checks authentication
4. **background.js**: Saves to Firestore via `saveLinkToFirestore()` (checks duplicates)
5. **background.js**: Updates cache immediately for instant feedback
6. **background.js**: Returns new link object to popup
7. **popup.js**: Adds to local queue array, displays immediately
8. **Real-time listener**: Fires on ALL devices, updates their caches automatically! 🔥

### Loading Links (Always Instant!)
1. Extension popup opens
2. **popup.js**: Sends `GET_AUTH_STATE` message to background
3. **background.js**: Returns current user from Firebase Auth
4. **popup.js**: Sends `GET_LINKS` message to background
5. **background.js**: Returns cached links (always fresh via real-time sync!)
6. **popup.js**: Displays random link instantly!

**Note:** No Firestore query needed! Real-time listener keeps cache fresh in background.

### Deleting a Link
1. User clicks "Delete" or "Open & Remove"
2. **popup.js**: Sends `DELETE_LINK` message to background with {linkId}
3. **background.js**: Deletes from Firestore via `deleteLinkFromFirestore()`
4. **background.js**: Updates local cache immediately
5. **background.js**: Returns success to popup
6. **popup.js**: Removes from local queue array, displays next random link
7. **Real-time listener**: Fires on ALL devices, removes deleted link from their caches! 🔥

### Real-Time Sync (Automatic!)
**Background:** Firestore `onSnapshot` listener runs continuously while signed in

**When dashboard deletes a link:**
1. Website updates Firestore
2. Extension's `onSnapshot` listener fires immediately (< 1 second!)
3. Cache updates automatically
4. Next popup open shows fresh data (deleted link is gone!)

**When switching devices:**
1. Save link on Device A → Firestore updated
2. Device B's `onSnapshot` listener fires automatically
3. Device B cache updated in real-time
4. Open popup on Device B → Already has the new link!

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
