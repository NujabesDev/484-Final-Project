# Read Later Random

A browser extension and web dashboard for saving links to read later, then retrieving them randomly one at a time. Eliminates choice paralysis by showing you just one link instead of an overwhelming list.

## Testing the Extension

### Build
```bash
cd extension
npm install
npm run build
```

### Load in Chrome
1. Go to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/dist/` folder

### Load in Firefox
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `extension/dist/manifest.json`

**Note:** Firefox removes temporary extensions when you close the browser. You'll need to reload it each time.
