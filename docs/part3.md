PART 3: TECHNICAL BREAKDOWN

### Extension Stack (Chrome/Firefox)

- **Framework**: React + Vite + shadcn/ui (shared with website!)
- **Cross-browser**: webextension-polyfill library
- **Manifest**: V3 for Chrome/Firefox compatibility
- **Content Extraction**: Readability.js for clean text
- **Sync & Auth**: Supabase JavaScript client
- **Click Interception**: Content scripts using addEventListener (capture phase)

### Backend Architecture

- **Platform**: Supabase (all-in-one solution)
    - PostgreSQL database
    - JWT-based authentication
    - Row-level security for multi-user data isolation
    - Real-time subscriptions for instant sync
    - Edge Functions for server-side operations
- **LLM Integration**: Edge Function calls Gemini API (keeps API key secure)

### Website Dashboard

- **Framework**: React + Vite
- **UI Library**: shadcn/ui (same as extension for component reuse)
- **Styling**: Tailwind CSS
- **Backend**: Same Supabase client as extension

### Authentication Flow

**Provider**: Google OAuth via Supabase Auth

**Why Google OAuth:**

- Zero friction - users already signed into Chrome
- No password management
- Instant signup/signin
- Native Supabase support

**Flow:**

1. User installs extension → clicks "Sign in with Google"
2. Google consent screen → approve permissions
3. Redirected to extension → authenticated
4. Session synced across extension + web dashboard

**Fallback:** Email + password (for non-Google users, though rare)

### 💾 Database Structure

Using PostgreSQL via Supabase with three main tables:

- **Users** → Basic account info
- **Queue Items** → Saved links with URLs, titles, summaries, timestamps, and read status
- **Settings** → User preferences including blocked sites, notification times, and feature toggles

### 🔌 API Services

- **Gemini API** (free tier): 15 requests/min, 1500 requests/day for summaries
- **Supabase** (free tier): All backend needs covered
- **Readability.js**: Client-side content extraction

### 🎯 Click Interception Technical Details

**Our Approach (Manifest V3 Compatible)**

- Content script injection on blocked sites
- addEventListener with capture phase to catch clicks before they bubble
- preventDefault() and stopPropagation() to block navigation
- Handles regular clicks, Ctrl+clicks, middle-clicks, and keyboard navigation

**What We Can Catch** ✅

- Regular clicks on links
- Ctrl+click (new tab)
- Middle-click (new tab)
- Enter key on focused links

**Known Limitations** ⚠️

- Direct URL typing in address bar (can't intercept)
- Browser history navigation (back/forward buttons)
- Keyboard shortcuts (Ctrl+L → paste URL)
- Some SPA navigation (may need to hook window.history.pushState for sites like new Reddit)

**Expected Reliability**: ~95% for normal browsing on link-heavy sites

### 🔄 Key Technical Flows

**Link Interception & Saving**

1. Content script catches click on blocked site
2. Prevents navigation, sends URL to background script
3. Background script extracts page content with Readability.js
4. Calls Supabase Edge Function → Gemini API for summary (if enabled)
5. Saves to Supabase database, syncs across devices

**Random Link Delivery**

query uses age-weighted randomization (older links get slightly higher probability) to help surface forgotten content.

1. User opens extension popup
2. Extension queries for random unread item from Supabase
3. Displays link with summary and action buttons
4. Accept = open URL + mark as read
5. Skip = close popup (item stays in queue)
6. Delete = remove from database
7. "Search queue" link opens web dashboard for users who need to find something specific

### 🔑 Extension Permissions Needed

- `storage` → For local/sync storage
- `activeTab` → To read current page
- `scripting` → To inject content scripts
- Host permissions → For each blocked site (e.g., `://*.reddit.com/*`)

### 🚀 Deployment Plan

- **Extension**: Unpacked loading for development/grading
- **Backend**: Supabase (fully hosted with HTTPS)
- **Website**: Vercel with GitHub auto-deploy