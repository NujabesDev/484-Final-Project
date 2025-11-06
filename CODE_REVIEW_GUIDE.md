# Code Review Guide - Read Later Random

## Quick Stats
- **Total code:** ~1,500 lines (very manageable!)
- **Two main parts:** Extension (402 lines core) + Website (544 lines core)
- **Biggest file:** `extension/src/popup.js` (402 lines) - this is your main focus
- **Most complex feature:** Authentication flow (spans 5 files)

---

## Project Overview

A browser extension + web dashboard system for saving links and retrieving them randomly. Built with React 19, Firebase 12, and Manifest V3. The extension is fully cloud-based requiring Google authentication, with all data stored in Firestore.

### Directory Structure

```
/Users/matt/Coding/484-Final-Project/
├── extension/              # Browser extension (Chrome/Firefox)
│   ├── src/               # Source files (402 LOC total)
│   │   ├── popup.js       # Main UI logic (402 lines) ⭐ LARGEST
│   │   ├── background.js  # Service worker (77 lines)
│   │   ├── firebase-config.js (76 lines)
│   │   ├── auth-bridge.js # Auth communication (58 lines)
│   │   ├── popup.css      # Tailwind styles (75 lines)
│   │   └── services/
│   │       └── firestore.js # Firestore operations (91 lines)
│   ├── dist/              # Build output (generated)
│   ├── manifest.json      # Extension manifest
│   ├── popup.html         # Extension popup UI
│   ├── package.json       # Dependencies
│   └── vite.config.js     # Build configuration
│
├── website/               # React dashboard (Vercel deployment)
│   ├── src/
│   │   ├── components/    # React components (24KB total)
│   │   │   ├── StorageChoiceScreen.jsx (180 lines) ⭐ AUTH FLOW
│   │   │   ├── DashboardScreen.jsx (56 lines - placeholder)
│   │   │   ├── ErrorBoundary.jsx (75 lines)
│   │   │   ├── DashboardIntroScreen.jsx (15 lines)
│   │   │   └── WelcomeScreen.jsx (18 lines)
│   │   ├── lib/           # Utilities
│   │   │   ├── auth.js    (50 lines)
│   │   │   └── firebase-config.js (24 lines)
│   │   ├── App.jsx        # Main app (134 lines)
│   │   ├── main.jsx       # Entry point (11 lines)
│   │   └── index.css      # Global styles (171 lines)
│   ├── dist/              # Build output (generated)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── CLAUDE.md              # Detailed project reference
├── ARCHITECTURE.md        # Architecture overview
├── README.md              # Setup instructions
└── vercel.json            # Deployment config
```

---

## Recommended Reading Order

### Phase 1: Understand the System (Start Here)

#### 1. Read the docs first (10 minutes)
- **`CLAUDE.md`** - Read this first to understand:
  - Why authentication is required
  - How the two-part system works
  - Data flow diagrams
- **`ARCHITECTURE.md`** - System design and future features

#### 2. Understand the data model (5 minutes)
- **`extension/src/services/firestore.js`** (91 lines)
- **Why first:** Everything revolves around how links are stored/retrieved
- **What to look for:**
  - The 4 main functions: load, save, delete, check duplicates
  - Firestore collection structure: `users/{userId}/links`
  - Error handling patterns

---

### Phase 2: Authentication Flow (Critical Security Review)

This is the **most complex part** - authentication happens across extension ↔ website.

#### 3. Website: Where auth starts
- **`website/src/components/StorageChoiceScreen.jsx`** (180 lines)
- **Key sections:**
  - Lines 70-87: `handleGoogleSignIn()` - Gets OAuth token from Google
  - Lines 12-57: `sendToExtension()` - Sends token via postMessage
- **Critical security question:** How does it ensure the message goes to the right extension?

#### 4. Extension: The auth bridge (SECURITY CRITICAL)
- **`extension/src/auth-bridge.js`** (58 lines)
- **Why critical:** This validates which websites can send auth tokens
- **Lines to scrutinize:**
  - Lines 9-18: `allowedOrigins` array - is this secure enough?
  - Lines 20-46: Message validation logic
- **Security concern:** Could a malicious site send fake tokens?

#### 5. Extension: Service worker receives auth
- **`extension/src/background.js`** (77 lines)
- **Key sections:**
  - Lines 19-30: External message listener - what can trigger this?
  - Lines 42-77: `handleAuthSuccess()` - Token storage in chrome.storage
- **Question:** Why store OAuth ID token instead of refresh token?

#### 6. Extension: Firebase authentication
- **`extension/src/firebase-config.js`** (76 lines)
- **Look for:**
  - Line 8: Why `firebase/auth/web-extension` instead of regular auth?
  - Lines 31-42: `signInWithStoredToken()` - token refresh logic
  - Lines 64-70: Token expiration handling

---

### Phase 3: Core UI Logic (Main Feature Review)

#### 7. Extension popup - The main app
- **`extension/src/popup.js`** (402 lines - LARGEST FILE)
- **Break it down into sections:**

**a) State Management (lines 1-50)**
- Global variables tracking queue, skip list, current link
- Recently added skip queue system (lines 9, 183-202)

**b) Core Features (lines 51-300)**
- `getRandomLink()` (lines 183-202) - Skip queue logic
- `displayRandomLink()` (lines 204-254) - UI animations
- `loadLinks()` (lines 162-181) - Loads from Firestore
- `saveLink()` (lines 266-307) - Saves current tab
- `deleteLink()` (lines 309-340) - Deletes and shows next

**c) Button Handlers (lines 300-402)**
- Skip button, delete button, open & remove
- Productivity mode toggle

**Things to check:**
- Is the skip queue working correctly? (Can you skip the same link twice?)
- What happens if Firestore is slow/fails?
- Is there any race condition with async operations?

---

### Phase 4: Website Components (Secondary)

#### 8. Main app routing
- **`website/src/App.jsx`** (134 lines)
- **Focus on:** How it detects extension vs manual visit (lines 34-43)

#### 9. Other screens (quick scan)
- **`DashboardScreen.jsx`** (56 lines) - **Placeholder only**
- **`ErrorBoundary.jsx`** (75 lines) - Error handling
- **`WelcomeScreen.jsx`** (18 lines) - Simple intro

---

### Phase 5: Configuration & Build

#### 10. Extension manifest
- **`extension/manifest.json`** (32 lines)
- **Check:** Permissions - are they all necessary?
- **Check:** Content script matches - which URLs inject auth-bridge?

#### 11. Build configs (quick scan)
- **`extension/vite.config.js`** (26 lines)
- **`website/vite.config.js`** (19 lines)

---

## Component Interaction Map

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─────────────────────────────────┐
       │                                 │
┌──────▼──────────┐            ┌────────▼────────┐
│   Extension     │            │    Website      │
│  (popup.html)   │            │  (Vercel App)   │
└─────────────────┘            └─────────────────┘
       │                                 │
       │ popup.js                        │ StorageChoiceScreen.jsx
       │ (UI Logic)                      │ (OAuth Popup)
       │                                 │
       ├──► background.js ◄──postMessage─┤
       │    (Service Worker)             │
       │         │                       │
       │         └──► auth-bridge.js ◄───┘
       │              (Content Script)
       │
       ├──► firebase-config.js
       │    (Auth with web-extension)
       │
       └──► services/firestore.js
            (CRUD Operations)
                   │
                   ▼
            ┌─────────────┐
            │  Firestore  │
            │ users/{uid} │
            │   /links    │
            └─────────────┘
```

---

## Technology Stack Analysis

### Extension Dependencies
```json
{
  "firebase": "^12.4.0",           // Auth + Firestore
  "@tailwindcss/vite": "^4.1.16",  // Styling
  "vite": "^7.1.12"                // Build tool
}
```

### Website Dependencies
```json
{
  "firebase": "^12.4.0",              // Auth + Firestore
  "react": "^19.2.0",                 // UI framework (bleeding edge!)
  "react-dom": "^19.2.0",
  "@vitejs/plugin-react": "^5.0.4",
  "tailwindcss": "^4.1.15"            // Styling
}
```

---

## Code Review Checklist

### Security Issues to Look For

- [ ] **Origin validation** in `auth-bridge.js:9-18` - Can malicious sites bypass?
- [ ] **Token storage** - Are tokens encrypted in chrome.storage.local?
- [ ] **Token expiration** - What happens when 1-hour token expires?
- [ ] **Firestore rules** - Are they configured? (Not in codebase - check Firebase console)
- [ ] **API keys exposed** - Expected for Firebase, but verify security rules exist
- [ ] **External message listener** in `background.js:20` - What validation exists?

### Bugs to Look For

- [ ] **Skip queue edge cases** in `popup.js:183-202`
  - What if you skip all links? (Handled: resets queue)
  - What if links.length === 0? (Check line 184)
- [ ] **Race conditions** - Multiple async Firestore operations
  - Can user click "Save" twice quickly?
  - What if delete happens while display is animating?
- [ ] **Error handling** - What if Firestore fails?
  - Check `firestore.js` error handlers
  - Are errors shown to the user?
- [ ] **Auth token refresh** - No automatic refresh implemented
  - User must re-sign-in after ~1 hour
- [ ] **Duplicate link detection** - How does it handle URL variants?
  - Does `https://example.com` == `https://example.com/`?

### Code Quality Issues

- [ ] **Code duplication** - `firebase-config.js` exists in both folders
  - Should this be shared? (Probably not - different Firebase auth methods)
- [ ] **Magic numbers** - Hard-coded animation durations (300ms)
- [ ] **No tests** - Zero test coverage
- [ ] **Inline styles** - Some CSS in popup.js (lines with classList.add)
- [ ] **Global state** - popup.js uses global variables instead of state management
- [ ] **Error messages** - Are they user-friendly?

### Missing Features (From Docs)

- [ ] **Productivity mode content script** - Toggle exists but no `content.js` found
  - CLAUDE.md mentions intercepting Reddit/YouTube clicks
  - Should this be implemented?
- [ ] **Website dashboard** - Currently just placeholder
- [ ] **Soft delete** - ARCHITECTURE.md mentions `status` field, but code does hard deletes
- [ ] **AI summaries** - Post-MVP feature mentioned in ARCHITECTURE.md

---

## Key Features & Complexity Analysis

### 1. Authentication Flow (HIGH COMPLEXITY) ⚠️
**Files involved:** 5 files across extension and website
- Extension cannot do OAuth popup → opens website in new tab
- Website performs Google OAuth → extracts `oauthIdToken`
- Token sent via postMessage → auth-bridge.js → background.js
- Extension uses `GoogleAuthProvider.credential()` → Firebase sign-in
- **Security considerations:** Origin validation in auth-bridge.js

### 2. Skip Queue System (MEDIUM COMPLEXITY)
**Files:** `extension/src/popup.js`
- Prevents immediate re-showing of skipped links
- Resets when all links exhausted
- Uses local array `skippedLinks` (not persisted)
- Lines 183-202, 365-373

### 3. Firestore Data Model (LOW COMPLEXITY)
**Collection:** `users/{userId}/links`
```javascript
{
  url: string,
  title: string,
  timestamp: number,  // Display timestamp
  createdAt: number   // Firestore field
}
```
- Document ID auto-generated by Firestore
- Duplicate detection via `where('url', '==', url)` query

### 4. Productivity Mode (NOT IMPLEMENTED)
**Files:** UI exists in popup.html/popup.js, but no content script
- Toggle present in extension
- Stored in `chrome.storage.local.productivityMode`
- **MISSING:** content.js to intercept Reddit/YouTube clicks

---

## Tools for Manual Review

### Open in your IDE side-by-side:

**Window 1 (Left):** Start with data layer
1. `firestore.js`
2. `popup.js`

**Window 2 (Right):** Auth flow
1. `StorageChoiceScreen.jsx`
2. `auth-bridge.js`
3. `background.js`

### Use browser dev tools:
1. Load extension from `extension/dist/` (after building)
2. Open extension popup → Right-click → "Inspect"
3. Check Console tab for errors
4. Check Application → Storage → Local Storage (chrome.storage)
5. Network tab → See Firestore API calls

### Use Firebase console:
1. Visit console.firebase.google.com
2. Project: `cs484-extension-493e5`
3. Check Firestore → `users` collection
4. Check Firestore Rules (Security tab)

---

## Build & Test Commands

### Extension
```bash
cd extension
npm install
npm run build        # Builds src files to /dist/
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

---

## Security Considerations for Review

### 1. Origin Validation (auth-bridge.js, lines 9-18)
```javascript
const allowedOrigins = [
  'https://484-final-project-three.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];
```
- **Question:** Is this list comprehensive enough?
- **Question:** Can an attacker spoof these origins?
- **Review:** How is the origin checked in the postMessage handler?

### 2. External Messages (background.js, line 20)
```javascript
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
```
- **Concern:** Could receive messages from any extension/website
- **Question:** What validation exists before processing?
- **Review:** Is there authentication before accepting auth data?

### 3. Token Storage (chrome.storage.local)
- Google OAuth ID token stored unencrypted
- Token valid for ~1 hour
- Auto-refresh not implemented (requires re-sign-in)
- **Question:** Should we use firebase refresh tokens instead?

### 4. Firebase API Keys (both firebase-config.js files)
- API keys visible in source code (expected for Firebase web apps)
- Security relies on Firestore security rules (not visible in codebase)
- **Action:** Verify rules in Firebase console

### 5. Firestore Security Rules (Check in Firebase Console)
- **Critical:** Verify that `users/{userId}/links` enforces auth
- **Expected rule:**
```javascript
match /users/{userId}/links/{linkId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## Known Issues & TODOs

### From ARCHITECTURE.md and Code

1. **Website Dashboard** - Currently placeholder (DashboardScreen.jsx, 56 lines)
   - No link viewing/management UI
   - Should read from Firestore `users/{userId}/links`

2. **Productivity Mode Content Script** - UI exists, functionality missing
   - Mentioned in CLAUDE.md but `content.js` not found
   - Should intercept Reddit/YouTube clicks

3. **Soft Delete System** - Planned but not implemented
   - ARCHITECTURE.md mentions `status`, `openedAt`, `deletedAt` fields
   - Current implementation does hard deletes

4. **AI Summaries** - Post-MVP feature
   - ARCHITECTURE.md mentions Firebase AI Logic SDK + Gemini

5. **Token Refresh** - Not implemented
   - Users must re-sign-in after ~1 hour when token expires
   - Should implement automatic refresh with Firebase refresh tokens

---

## Estimated Review Time

- **Phase 1 (Docs):** 15 minutes
- **Phase 2 (Auth flow):** 45 minutes
- **Phase 3 (Core UI):** 60 minutes
- **Phase 4 (Website):** 20 minutes
- **Phase 5 (Config):** 10 minutes

**Total: ~2.5 hours for thorough review**

---

## Quick Wins for Improvement

If you find issues during review, here are some quick improvements:

1. **Add input validation** in `firestore.js:29` - Validate URL format before saving
2. **Add loading states** in `popup.js` - Show spinner during Firestore operations
3. **Implement token refresh** in `firebase-config.js` - Auto-refresh expired tokens
4. **Add error boundaries** in extension popup (like website has)
5. **Write unit tests** for skip queue logic - Prevent regression bugs
6. **Add rate limiting** - Prevent rapid-fire button clicks
7. **Improve error messages** - Make them user-friendly and actionable

---

## Questions for Discussion

1. Why is the Google OAuth ID token stored instead of a Firebase refresh token?
2. Should skip queue persist across browser sessions?
3. Are Firestore security rules properly configured for `users/{userId}/links`?
4. Why is productivity mode toggle present but content script missing?
5. Is the soft delete system (status tracking) planned for current sprint?
6. Should there be automated tests for the auth flow?
7. How should we handle token expiration? Auto-refresh or require re-sign-in?
8. Should the website dashboard be prioritized over productivity mode?

---

## File Size Summary

**Largest files:**
1. `popup.js` - 402 lines (extension UI logic)
2. `StorageChoiceScreen.jsx` - 180 lines (auth flow)
3. `index.css` - 171 lines (website styles)
4. `App.jsx` - 134 lines (website routing)
5. `firestore.js` - 91 lines (data layer)

**Total source code:** ~1,500 lines (excluding node_modules, dist, generated files)

---

## Top 3 Recommendations

1. **Start with `firestore.js`** - It's short (91 lines) and everything depends on it
2. **Then tackle `popup.js`** - It's the longest but well-structured with clear sections
3. **Deep dive auth flow** - Read all 4 files in sequence: StorageChoiceScreen → auth-bridge → background → firebase-config

---

## Testing Checklist

### Manual Testing Scenarios

**Authentication:**
- [ ] Sign in from extension → Verify token stored in chrome.storage
- [ ] Sign out → Verify token cleared
- [ ] Wait 1 hour → Verify token expiration handling
- [ ] Try signing in twice quickly → Check for race conditions

**Link Management:**
- [ ] Save a new link → Verify in Firestore console
- [ ] Save duplicate link → Should show error
- [ ] Delete a link → Verify removed from Firestore
- [ ] Skip a link → Verify it doesn't show immediately
- [ ] Skip all links → Verify queue resets

**Edge Cases:**
- [ ] No internet connection → How do errors appear?
- [ ] Firestore rules deny access → Is error message clear?
- [ ] Empty queue → What does UI show?
- [ ] Very long URL or title → Does UI break?

**Browser Compatibility:**
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Edge (Chromium-based)

---

Good luck with your code review! The codebase is well-documented and reasonably sized. Focus on the auth flow first, as that's the trickiest part with the most security implications.
