# Extension Code - Detailed References

## File Locations & Absolute Paths

```
/home/user/484-Final-Project/extension/
├── manifest.json                      (32 lines)
├── popup.html                         (110 lines)
├── vite.config.js                     (26 lines)
├── package.json                       (18 lines)
└── src/
    ├── background.js                  (59 lines)
    ├── popup.js                       (396 lines) ← MAIN LOGIC
    ├── auth-bridge.js                 (42 lines)
    ├── config.js                      (18 lines)
    ├── popup.css                      (46 lines)
    └── services/
        └── firestore.js               (79 lines)
```

---

## Critical Code Locations

### THE DEAD FEATURE: Productivity Mode

**Location 1: HTML Definition**
- File: `/home/user/484-Final-Project/extension/popup.html`
- Lines: 21-27
- Status: UI element exists but not wired up
```html
<button id="productivityToggle" class="...">
  <div class="..."></div>
</button>
```

**Location 2: Missing Implementation**
- File: `/home/user/484-Final-Project/extension/src/popup.js`
- Search result: `const productivityToggle = document.getElementById('productivityToggle');`
- Status: NOT FOUND - no reference to this button
- Missing: Event listener, state reading/writing

**Location 3: Missing in Manifest**
- File: `/home/user/484-Final-Project/extension/manifest.json`
- Status: No content script defined for Reddit/YouTube link interception
- Would need: Content script matches for *.reddit.com and *.youtube.com


### FRAGILE ERROR HANDLING

**Location: showErrorMessage() function**
- File: `/home/user/484-Final-Project/extension/src/popup.js`
- Lines: 258-279
- Problem: 2-second timeout with no cancellation
```javascript
function showErrorMessage(message) {
  const originalTitle = linkTitle.textContent;
  const originalUrl = linkUrl.textContent;
  
  linkTitle.textContent = message;
  linkUrl.textContent = '';
  linkTitle.style.color = '#ef4444'; // Inline style!
  
  setTimeout(() => {
    linkTitle.style.color = '';
    // Restore - but queue might have changed!
  }, 2000);
}
```

**Called from:**
- Line 325: saveLink() - "Link already saved!"
- Line 327: saveLink() - "Failed to save link"
- Line 350: deleteLink() - "Failed to delete link"
- Line 133: syncInBackground() - "Failed to sync - using cached data"


### DUAL SYNC RACE CONDITION

**Path 1: init() function**
- File: `/home/user/484-Final-Project/extension/src/popup.js`
- Lines: 73-88
- Calls: `syncInBackground()` at line 87
```javascript
async function init() {
  const cached = await loadCacheFromLocal();
  updateAuthUI();
  if (cached.links.length > 0) {
    queue = cached.links;
    displayRandomLink();
  }
  syncInBackground(); // ← FIRST SYNC PATH
}
```

**Path 2: onAuthStateChanged listener**
- File: `/home/user/484-Final-Project/extension/src/popup.js`
- Lines: 91-103
- Calls: `syncInBackground()` at line 96
```javascript
onAuthStateChanged(auth, async (user) => {
  updateAuthUI();
  
  if (user) {
    await syncInBackground(); // ← SECOND SYNC PATH
  } else {
    queue = [];
    await clearLinkCache();
    displayRandomLink();
  }
});
```

**Issue:**
- init() called at line 395: `init();`
- Both syncInBackground() calls fetch from Firestore
- Both call updateAuthUI()
- Race condition: which completes first?


### STATE UPDATE PATTERN REPETITION

**Appearance 1: saveLink()**
- File: `/home/user/484-Final-Project/extension/src/popup.js`
- Lines: 305-330
```javascript
queue.push(newLink);                    // Step 1: Update memory
await saveCacheToLocal(queue);          // Step 2: Update cache
displayRandomLink();                    // Step 3: Refresh UI
```

**Appearance 2: deleteLink()**
- File: `/home/user/484-Final-Project/extension/src/popup.js`
- Lines: 333-352
```javascript
queue = queue.filter(link => link.id !== id);  // Step 1
await saveCacheToLocal(queue);                  // Step 2
// displayRandomLink() NOT called here!
```

**Appearance 3: syncInBackground()**
- File: `/home/user/484-Final-Project/extension/src/popup.js`
- Lines: 119-129
```javascript
queue = freshLinks;                     // Step 1: Update memory
await saveCacheToLocal(freshLinks);     // Step 2: Update cache
displayRandomLink();                    // Step 3: Refresh UI
```

**Issue:** Inconsistent - deleteLink doesn't call displayRandomLink()


### GOD FUNCTION: displayRandomLink()

- File: `/home/user/484-Final-Project/extension/src/popup.js`
- Lines: 219-255
- Handles:
  1. Empty state (if !currentLink):
     - Updates linkCard visibility
     - Updates actionButtons visibility
     - Sets title/url text
  2. Filled state (if currentLink):
     - Updates all 4 DOM elements
     - Updates favicon
     - Calls updateButtonStates()
     - Calls updateQueueCount()


### STATS DISPLAY INCONSISTENCY

**updateQueueCount() function**
- File: `/home/user/484-Final-Project/extension/src/popup.js`
- Lines: 282-302
- Issue: Stats hidden when queue empty, but link card shown
```javascript
if (queue.length === 0) {
  queueCount.classList.add('hidden');  // ← Hide stats
  return;
}
// ...
```

**But in displayRandomLink():**
- Line 224: `linkCard.classList.remove('hidden');` ← Always show link card
- Should be: hidden if queue is empty


### DOM ELEMENTS ALL AT MODULE LEVEL

- File: `/home/user/484-Final-Project/extension/src/popup.js`
- Lines: 51-70
- Problem: 20+ global references, no encapsulation
```javascript
const linkCard = document.getElementById('linkCard');
const linkTitle = document.getElementById('linkTitle');
const linkUrl = document.getElementById('linkUrl');
const linkFavicon = document.getElementById('linkFavicon');
const queueCount = document.getElementById('queueCount');
const statsRemaining = document.getElementById('statsRemaining');
const statsTime = document.getElementById('statsTime');
const actionButtons = document.getElementById('actionButtons');
const openBtn = document.getElementById('openBtn');
const skipBtn = document.getElementById('skipBtn');
const deleteBtn = document.getElementById('deleteBtn');
const saveCurrentBtn = document.getElementById('saveCurrentBtn');
const signedOutDiv = document.getElementById('signedOut');
const signedInDiv = document.getElementById('signedIn');
const signInBtn = document.getElementById('signInBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const userAvatar = document.getElementById('userAvatar');
```

---

## STATE MANAGEMENT LAYERS

### Layer 1: Firestore (Source of Truth)
- Location: `users/{userId}/links` collection
- Each document has: `{ url, title, createdAt }`
- Accessed via: `/home/user/484-Final-Project/extension/src/services/firestore.js`

### Layer 2: IndexedDB (Firebase Auth Persistence)
- Managed by: Firebase SDK automatically
- Contains: User session, auth tokens
- Location: Browser's IndexedDB storage
- Restored by: Firebase Auth on `onAuthStateChanged()`

### Layer 3: Chrome Storage (Cache)
- Location: `chrome.storage.local`
- Keys: `cachedQueue`, `cacheTimestamp`
- Managed by: `/home/user/484-Final-Project/extension/src/popup.js`
  - Save: line 182-186: `saveCacheToLocal()`
  - Load: line 189-196: `loadCacheFromLocal()`
  - Clear: line 198-200: `clearLinkCache()`

### Layer 4: Memory (popup.js)
- Variables: `queue` array, `currentLink` object
- File: `/home/user/484-Final-Project/extension/src/popup.js`
- Lines: 6-8
- Lifespan: Only while popup is open


---

## Key Functions & Their Interactions

### Authentication Flow

1. **User clicks "Sign in" button**
   - Handler: `/home/user/484-Final-Project/extension/src/popup.js` line 391
   - Calls: `handleSignIn()` (line 169-174)
   - Opens: `chrome.tabs.create({ url: buildAuthUrl() })`

2. **Website performs Google OAuth**
   - File: `/home/user/484-Final-Project/website/src/lib/auth.js`
   - Gets ID token from Firebase Auth

3. **Website posts message to extension**
   - Sends: `window.postMessage({ type: 'AUTH_TO_EXTENSION', token })`
   - Receiver: `/home/user/484-Final-Project/extension/src/auth-bridge.js` (line 6-37)

4. **auth-bridge validates and forwards**
   - Validates: `ALLOWED_ORIGINS.includes(event.origin)` (line 8)
   - Forwards: `chrome.runtime.sendMessage({ action: 'AUTH_SUCCESS', token })` (line 17-20)

5. **background.js receives message**
   - Handler: `/home/user/484-Final-Project/extension/src/background.js` (line 35-42)
   - Calls: `handleAuthSuccess()` (line 45-58)
   - Executes: `signInWithCredential(auth, credential)` (line 52)
   - Persists: To IndexedDB automatically

6. **Firebase event fires**
   - Event: `onAuthStateChanged()` in popup.js (line 91)
   - Triggers: `updateAuthUI()` and `syncInBackground()`


### Data Sync Flow

**When popup opens:**
```
init() [line 73]
├─ loadCacheFromLocal() [line 189]
│   └─ Reads chrome.storage.local
├─ updateAuthUI() [line 78, 155]
│   └─ Updates .hidden classes on auth sections
├─ displayRandomLink() [line 83, 219]
│   └─ Shows first random link from cache
└─ syncInBackground() [line 87, 106]
    ├─ updateAuthUI() [line 112]
    ├─ loadLinksFromFirestore() [firestore.js line 20]
    │   └─ Fetches users/{uid}/links from Firestore
    ├─ hasChanged(queue, freshLinks) [line 143]
    │   └─ Compares memory queue with fresh data
    └─ If changed:
        ├─ queue = freshLinks [line 122]
        ├─ saveCacheToLocal() [line 125]
        └─ displayRandomLink() [line 128]
```

---

## Configuration Centralization

**File:** `/home/user/484-Final-Project/extension/src/config.js`

```javascript
export const WEBSITE_URL = 'https://484-final-project-three.vercel.app/';

export const ALLOWED_ORIGINS = [
  'https://484-final-project-three.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

export function buildAuthUrl() {
  const extensionId = chrome.runtime.id;
  return `${WEBSITE_URL}?source=extension&extensionId=${extensionId}`;
}
```

**Used in:**
- `background.js` line 5: `buildAuthUrl()`
- `popup.js` line 4: `WEBSITE_URL`, `buildAuthUrl()`
- `auth-bridge.js` line 3: `ALLOWED_ORIGINS`

**NOTE:** manifest.json line 2 says content_scripts.matches must stay in sync with ALLOWED_ORIGINS


---

## Build & Deployment

**Build Command:** `cd /home/user/484-Final-Project/extension && npm run build`

**Build Process:**
1. Vite bundles JS files (line 10-14 in vite.config.js)
   - `src/background.js` → `dist/background.js`
   - `src/popup.js` → `dist/popup.js`
   - `src/popup.css` → `dist/popup-css.css`
   - `src/auth-bridge.js` → `dist/auth-bridge.js`
2. Copies manifest and HTML (npm run copy-files)
   - `manifest.json` → `dist/manifest.json`
   - `popup.html` → `dist/popup.html`

**Load in Browser:**
- Chrome: `chrome://extensions/` → Load unpacked → Select `/dist/`
- Firefox: `about:debugging` → Load Temporary Add-on → Select `manifest.json`


---

## Dependencies

**package.json locations:**
- `/home/user/484-Final-Project/extension/package.json`

**Production Dependencies:**
- `firebase@^12.4.0` - Only Firebase, no bloat

**Dev Dependencies:**
- `@tailwindcss/vite@^4.1.16`
- `tailwindcss@^4.1.16`
- `vite@^7.1.12`

**Import paths in code:**
- `firebase/app` - Firebase initialization
- `firebase/auth/web-extension` - Web Extension safe auth
- `firebase/firestore` - Firestore database
- All imports ES modules (type: "module" in package.json)

---

## Security Considerations

### postMessage Validation (auth-bridge.js)
- **File:** `/home/user/484-Final-Project/extension/src/auth-bridge.js`
- **Line:** 8
- **Pattern:** `if (!ALLOWED_ORIGINS.includes(event.origin))`
- **Effect:** Drops messages from unknown origins (safe)

### Token Handling
- Tokens never stored in chrome.storage
- Firebase handles token refresh automatically
- Session persisted to IndexedDB (Firebase standard)
- No manual token management code

### User Data Scope
- Each user's links at: `users/{userId}/links`
- Firestore rules not visible in extension code
- Assume backend enforces: user can only read own documents

---

## Missing or Incomplete Features

### 1. Productivity Mode
- UI Button: popup.html lines 21-27 ✓
- Event Handler: popup.js ✗ (NOT FOUND)
- Storage Read/Write: popup.js ✗ (NOT FOUND)
- Content Script: manifest.json ✗ (NOT FOUND)
- Reddit/YouTube Interception: ✗ (NOT IMPLEMENTED)

### 2. Error Toast/Notification
- Current approach: hijack link display (line 258-279)
- Better approach: dedicated error element or toast library
- Status: NOT IMPLEMENTED

### 3. Dashboard
- Website has placeholder component
- File: `/home/user/484-Final-Project/website/src/components/DashboardScreen.jsx`
- Status: NOT IMPLEMENTED

### 4. Link Editing
- No edit functionality
- Only save, delete, skip, open operations
- Status: NOT PLANNED

---

## Testing Coverage

**Test Files:** None found in `/home/user/484-Final-Project/extension/`

**What Should Be Tested:**
1. Firestore CRUD operations
   - Save with duplicate detection
   - Delete with correct document ID
   - Load with proper collection path
   
2. State consistency
   - Memory queue matches cache
   - Cache matches Firestore (eventually)
   - No data loss on sync

3. Auth flow
   - postMessage validation
   - Token forwarding
   - Session persistence

4. UI state
   - Button enable/disable logic
   - Link card visibility
   - Auth section visibility

**Current Status:** Untested - manual testing only

