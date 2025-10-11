# Read Later Random

Browser extension that saves links for later, then shows you ONE random link at a time.

## What it does

- Save links you want to read later
- Get a random link from your queue when you open the extension
- See an AI summary to decide if you want to read it now
- Accept, skip, or delete the link

## Why random?

No more overwhelming lists. No choice paralysis. Just one thing to decide on at a time.

## Tech Stack

- **Extension**: React + Vite + Tailwind CSS (Chrome/Firefox)
- **Website**: React + Vite + Tailwind CSS
- **Backend**: Firebase (Firestore + Auth + Cloud Functions)
- **AI**: Google Gemini API

---

## Testing

### 1. Build the Extension

```bash
cd extension
npm run build
```

This creates the `extension/dist` folder with compiled files.

### 2. Load in Chrome

1. Go to `chrome://extensions/`
2. Turn on **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select the `extension/dist` folder

To reload: Click the ↻ icon on the extension card.

### 3. Load in Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `extension/dist/manifest.json`

To reload: Click **Reload** next to the extension.

Note: Firefox removes temporary extensions when you close the browser.

---

## Project Structure

```
/484-Final-Project/
│
├── extension/          🧩 THE BROWSER EXTENSION
│   ├── src/
│   │   ├── popup.jsx       → Main React component for the extension popup
│   │   ├── index.css       → Tailwind CSS styles
│   │   └── lib/utils.js    → Utility functions
│   ├── dist/              → Built extension files (load this in browser)
│   ├── manifest.json      → Extension config (permissions, name, etc.)
│   ├── popup.html         → Entry HTML for the extension popup
│   ├── package.json       → Dependencies & build scripts
│   ├── vite.config.js     → Vite bundler config
│   └── BROWSER_SETUP.md   → Instructions for loading in Chrome/Firefox
│
├── website/           🌐 WEB DASHBOARD (companion site)
│   ├── src/
│   │   ├── App.jsx         → Main React app component
│   │   ├── main.jsx        → React entry point
│   │   ├── index.css       → Tailwind CSS styles
│   │   └── lib/utils.js    → Utility functions
│   ├── dist/              → Built website files
│   ├── index.html         → Entry HTML for the website
│   ├── package.json       → Dependencies & build scripts
│   └── vite.config.js     → Vite bundler config
│
├── .git/              📦 Git repository
├── .gitignore
└── README.md          📖 Main project documentation
```

### Key Files

**Extension:**
- `extension/src/popup.jsx` - Main UI logic
- `extension/manifest.json` - Browser extension configuration
- `extension/package.json` - Build scripts (build, package for Chrome/Firefox)

**Website:**
- `website/src/App.jsx` - Main web app
- Similar structure to extension

See `claude.md` and `TECH_STACK.md` for complete technical documentation.
