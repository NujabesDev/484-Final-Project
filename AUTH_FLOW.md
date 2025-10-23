# Simple Auth Flow for Extension + Website

## How It Works

### The Simple 3-Step Flow

1. **User clicks "Sign in with Google" in extension**
   - Extension opens your auth website in a new tab
   - Passes extension ID in URL: `https://your-site.com?source=extension&extensionId=abc123`

2. **User signs in on the website**
   - Website shows Google OAuth popup (normal Firebase auth)
   - User clicks "Sign in with Google" → Google popup → Done
   - Website gets auth token from Firebase

3. **Website sends token back to extension**
   - Website uses `chrome.runtime.sendMessage()` to send token to extension
   - Extension saves token + user info to `chrome.storage.local`
   - Website closes automatically
   - Extension now authenticated!

---

## Why This Works

✅ **Cross-browser** - Works identically in Chrome and Firefox
✅ **Simple** - No OAuth config in manifest.json needed
✅ **Reliable** - Website auth is straightforward, no extension restrictions
✅ **Secure** - Token never exposed, stored only in extension storage

---

## What I Built

### 1. `/auth-website` folder
A simple standalone auth page with:
- `index.html` - Pretty sign-in page
- `auth.js` - Firebase Google auth + sends token to extension
- `package.json` - Just needs `firebase` and `vite`

### 2. `/extension` folder
Basic extension with:
- `manifest.json` - Extension config
- `popup.html` - Extension UI (sign in/out buttons)
- `popup.js` - Opens auth website when user clicks "Sign in"
- `background.js` - Listens for auth token from website and saves it

---

## How to Test

### 1. Run auth-website locally
```bash
cd auth-website
npm install
npm run dev
# Opens at http://localhost:5173
```

### 2. Load extension in browser

**Chrome:**
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `/extension` folder

**Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `/extension/manifest.json`

### 3. Test the flow
1. Click extension icon
2. Click "Sign in with Google"
3. New tab opens → Click "Sign in with Google" button
4. Google OAuth popup → Sign in
5. Tab closes automatically
6. Extension now shows you're signed in!

---

## What Happens Behind the Scenes

```
Extension (popup.js)
  ↓
  Opens: http://localhost:5173?source=extension&extensionId=abc123
  ↓
Website (auth.js)
  ↓
  User signs in with Google
  ↓
  Gets Firebase auth token
  ↓
  chrome.runtime.sendMessage(extensionId, { token, user })
  ↓
Extension (background.js)
  ↓
  Receives message
  ↓
  Saves to chrome.storage.local
  ↓
Extension (popup.js)
  ↓
  Reads from storage → Shows "Signed in!"
```

---

## To Deploy

1. **Deploy auth-website** to Vercel/Netlify
   - Get URL like `https://auth.yourapp.com`

2. **Update extension/popup.js**
   - Change `AUTH_URL` from `http://localhost:5173` to your deployed URL

3. **Update extension/manifest.json**
   - Add your deployed URL to `externally_connectable.matches`
   - Example: `"https://auth.yourapp.com/*"`

4. **Test again** - Same flow, but with real URL!

---

## That's It!

**Total code:** ~150 lines
**Time to implement:** 20 minutes
**Complexity:** Very low
**Works in:** Chrome + Firefox
