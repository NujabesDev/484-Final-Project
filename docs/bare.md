Here's what you need to build **first** to get the core concept working:

## **PHASE 0: Local-Only Proof of Concept** (Start Here!)

**Goal:** Prove the random delivery mechanic works with zero backend complexity

### What to Build:

1. **Basic Extension Structure**
    
    ```
    manifest.json (V3)
    popup.html + popup.js
    background.js (service worker)
    
    ```
    
2. **Popup UI - The Heart of Everything**
    - Shows ONE random link from storage
    - Three buttons: "Open & Remove" / "Skip" / "Delete"
    - Simple "Add Current Page" button for manual saving
    - Plain HTML/CSS for now (React later)
3. **Local Storage Only**
    
    ```jsx
    // Save structure:
    {
      queue: [
        { id: '123', url: 'https://...', title: 'Page Title', timestamp: Date.now() }
      ]
    }
    
    ```
    
4. **Core Functions**
    - `saveLink(url, title)` - adds to queue
    - `getRandomLink()` - returns one random item
    - `deleteLink(id)` - removes from queue
    - `openAndRemove(id)` - opens link + deletes

**Skip for now:** Auth, backend, AI summaries, interception, dashboard, cross-browser support

**Test:** Can you manually save 10 links and randomly view them one at a time?

---

## **PHASE 1: Add Click Interception**

**Goal:** Productivity mode - block and auto-save links

### What to Add:

1. **Content Script** (`content.js`)
    
    ```jsx
    // Intercept clicks on blocked sites
    document.addEventListener('click', handleClick, true);
    
    ```
    
2. **Settings in Storage**
    
    ```jsx
    { blockedSites: ['reddit.com', 'youtube.com'] }
    
    ```
    
3. **Interstitial Page** (`blocked.html`)
    - Shows "Saved for later!" message
    - Link is already saved in background

**Test:** Click a Reddit link, see it get blocked and saved

---

## **PHASE 2: Backend Setup (Supabase)**

**Goal:** Multi-device sync and proper auth

### What to Add:

1. **Supabase Project**
    - Create tables: `users`, `queue_items`, `settings`
    - Set up row-level security
    - Get API keys
2. **Authentication**
    - Email/password for now (OAuth later)
    - Login screen in extension popup
3. **Replace Local Storage**
    - Extension now reads/writes to Supabase
    - Background sync logic

**Test:** Save on desktop, see it on laptop (same account)

---

## **PHASE 3: React + Shared Components**

**Goal:** Make UI maintainable and prep for dashboard

### What to Refactor:

1. **Convert Extension to React**
    - Vite + React setup
    - Build process for extension output
2. **Add shadcn/ui**
    - Button, Card, Dialog components
    - Tailwind CSS
3. **Create Shared Components**
    - `LinkCard` - displays random link
    - `ActionButtons` - Accept/Skip/Delete
    - Can reuse in dashboard later

**Test:** Same functionality, nicer UI

---

## **PHASE 4: Web Dashboard**

**Goal:** Full queue view and management

### What to Build:

1. **React Website** (separate from extension)
    - Login page
    - Queue view (all links in a list)
    - Search and filter
2. **Reuse Components**
    - Same UI library as extension
    - Same Supabase client

**Test:** View and manage entire queue on web

---

## **PHASE 5: AI Summaries**

**Goal:** Add the AI magic

### What to Add:

1. **Supabase Edge Function**
    
    ```jsx
    // Receives URL → scrapes content → calls Gemini → returns summary
    
    ```
    
2. **Opt-in Setting**
    - Checkbox in settings
    - Privacy disclosure
3. **Update Link Card**
    - Show one-sentence summary below title

**Test:** Save link, see AI summary in popup

---

## 🚀 **START HERE - First 2 Hours:**

```
✅ Create manifest.json (V3 boilerplate)
✅ Create popup.html with 3 buttons
✅ Create popup.js with:
   - chrome.storage.local read/write
   - getRandomLink() function
   - Button click handlers
✅ Test manually saving and viewing random links

```

**Once that works**, you've proven the core concept. Everything else is adding features to this foundation.

---

## 📝 Critical Files for Phase 0:

**manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Read Later Random",
  "version": "0.1",
  "permissions": ["storage", "activeTab"],
  "action": {
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  }
}

```

**popup.html** - One random link + 3 buttons + "Save Current Page" button

**popup.js** - Storage operations + randomization logic

That's it. Build that first. Then move to Phase 1.