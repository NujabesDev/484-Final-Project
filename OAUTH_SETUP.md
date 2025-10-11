# OAuth Setup & Testing Guide

This guide explains how to set up and test the OAuth integration between your website and extension.

## Architecture Overview

**Website → Extension Flow:**
1. User signs in with Google on website
2. Website receives Firebase Auth user object
3. Website sends user data to extension via `chrome.runtime.sendMessage`
4. Extension stores user data in `chrome.storage.local`
5. Extension can now use this data for Firestore sync

**Sign Out Flow:**
1. User signs out on website (or auth state changes)
2. Website sends CLEAR_USER message to extension
3. Extension removes user data from storage

## Setup Instructions

### Step 1: Build the Extension

```bash
cd extension
npm run build
```

### Step 2: Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension/dist` folder
5. **Copy the Extension ID** shown under your extension (it looks like: `abcdefghijklmnopqrstuvwxyz123456`)

### Step 3: Configure Extension ID

1. Open `shared/extensionMessaging.js`
2. Find this line:
   ```javascript
   const EXTENSION_ID = 'YOUR_EXTENSION_ID_HERE'
   ```
3. Replace `YOUR_EXTENSION_ID_HERE` with the ID you copied from Chrome
4. Save the file

### Step 4: Start the Website

```bash
cd website
npm run dev
```

The website should now be running at `http://localhost:5173`

## Testing the Integration

### Test 1: Check Extension is Detected

1. Open browser console (F12)
2. Go to your website at `http://localhost:5173`
3. You should see console logs indicating extension messaging status

### Test 2: Test Google Sign-In

1. Navigate through the website onboarding screens
2. Click "Sign in with Google" on the storage choice screen
3. Complete the Google OAuth flow
4. Check browser console for these messages:
   - `Auth state: user signed in, syncing with extension`
   - `User data sent to extension successfully`

### Test 3: Verify Extension Received Data

1. Go to `chrome://extensions/`
2. Click "Service worker" or "background page" under your extension
3. In the console that opens, run:
   ```javascript
   chrome.storage.local.get('user', (result) => console.log(result))
   ```
4. You should see your user data:
   ```javascript
   {
     user: {
       uid: "...",
       email: "your@email.com",
       displayName: "Your Name",
       photoURL: "..."
     }
   }
   ```

### Test 4: Test Sign-Out Sync

1. Add a sign-out button to your dashboard (or manually call `signOut()` from console)
2. Sign out
3. Check browser console for:
   - `Auth state: user signed out, clearing from extension`
   - `User data cleared from extension successfully`
4. Check extension storage again - user data should be gone

## Troubleshooting

### "Extension not installed or not responding"

**Causes:**
- Extension isn't loaded in Chrome
- Wrong extension ID in `extensionMessaging.js`
- Extension's background service worker crashed

**Solutions:**
1. Verify extension is loaded at `chrome://extensions/`
2. Double-check extension ID matches
3. Click "Reload" on the extension card
4. Check extension's service worker console for errors

### "Unauthorized origin" error in extension logs

**Causes:**
- Website URL not in manifest's `externally_connectable`

**Solution:**
1. Open `extension/manifest.json`
2. Verify your website URL is in the `matches` array:
   ```json
   "externally_connectable": {
     "matches": [
       "http://localhost:5173/*",
       "http://localhost:3000/*"
     ]
   }
   ```
3. Rebuild extension: `cd extension && npm run build`
4. Reload extension in Chrome

### OAuth popup blocked

**Solution:**
- Allow popups for `http://localhost:5173` in Chrome settings
- Or click the popup icon in address bar when it appears

### Extension messaging works but data isn't persisted

**Check:**
1. Extension has `storage` permission in manifest
2. Background service worker isn't crashing (check service worker console)
3. No errors in `handleSetUser` function in `background.js`

## What's Being Sent?

For transparency, here's what data is sent from website to extension:

```javascript
{
  action: 'SET_USER',
  user: {
    uid: "firebase-user-id",
    email: "user@email.com",
    displayName: "User Name",
    photoURL: "https://..."
  }
}
```

**Not sent:**
- Firebase ID tokens (access tokens)
- Passwords
- Full auth credentials

The extension can use this basic user info to:
- Identify which Firestore user document to sync with
- Display user info in popup
- Enable cross-device sync

## Next Steps

Once OAuth sync is working:
1. Implement Firestore sync in extension using the stored user UID
2. Add real-time listeners for link data
3. Implement the full sync flow described in `.claude/CLAUDE.md`

## Production Deployment

Before deploying to production:

1. **Update manifest.json** with production URL:
   ```json
   "externally_connectable": {
     "matches": [
       "https://yourproductiondomain.com/*"
     ]
   }
   ```

2. **Security considerations:**
   - Extension ID is public (anyone can see it)
   - `externally_connectable` limits which websites can message your extension
   - Only send minimal user data (no tokens, passwords, or sensitive info)
   - Validate all messages in `background.js` (already done)

3. **Publishing:**
   - Build extension: `npm run build`
   - Submit to Chrome Web Store
   - Get published extension ID
   - Update website's `extensionMessaging.js` with production extension ID
   - Deploy website with updated ID
