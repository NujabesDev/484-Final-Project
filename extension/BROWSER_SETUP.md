# Browser Setup Guide

This extension supports **Chrome** and **Firefox**.

## Build Commands

```bash
# Build for both browsers (same output works for both)
npm run build

# Or use browser-specific aliases
npm run build:chrome
npm run build:firefox

# Create distributable ZIP files
npm run package:chrome    # Creates read-later-chrome.zip
npm run package:firefox   # Creates read-later-firefox.zip
```

## Load in Chrome

1. Build the extension: `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `extension/dist` folder
6. The extension icon will appear in your toolbar

**To reload after changes:**
- Click the ↻ reload icon on the extension card

## Load in Firefox

1. Build the extension: `npm run build`
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on...**
4. Navigate to `extension/dist/` and select `manifest.json`
5. The extension will appear in your toolbar

**To reload after changes:**
- Click the **Reload** button next to the extension

**Note:** Firefox removes temporary extensions when you close the browser.

## Differences Between Browsers

### Manifest
- The `browser_specific_settings.gecko` field is **required for Firefox** but **ignored by Chrome**
- The same build works for both browsers

### APIs
- Both use `webextension-polyfill` for consistent API calls
- Code written with `browser.*` namespace works in both

### Storage Limits
- Chrome: 10MB for local storage
- Firefox: Unlimited with proper permissions

## Publishing

### Chrome Web Store
1. Run: `npm run package:chrome`
2. Upload `read-later-chrome.zip` to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. One-time $5 developer fee required

### Firefox Add-ons
1. Run: `npm run package:firefox`
2. Upload `read-later-firefox.zip` to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
3. No developer fee required
