# READ LATER EXTENSION - Complete Project Documentation

*Random delivery. AI summaries. Actually read stuff.*

---

## 🎯 THE CORE IDEA

**What We're Building**
Browser extension that saves links for later, then shows you ONE random link at a time with an AI summary

**Two Modes**
- **Productivity Mode**: Blocks distracting sites, auto-saves links
- **Fun Mode**: Manual bookmark button

**The Magic**
Random delivery + AI summaries = actually reading saved stuff instead of hoarding

---

## 📋 PART 1: ELEVATOR PITCH

### The Problem We're Solving

We all do it - save Reddit posts, YouTube videos, and articles to read later. But those lists become digital graveyards. They grow endlessly, we never look at them, and the content loses relevance. The friction is too high: hundreds of items, no context about what each link was, and complete paralysis from too many choices.

### Our Solution

We're building a browser extension that intercepts this behavior. It has two modes: productivity mode auto-saves links when you're supposed to be working (and blocks the navigation), while fun mode lets you manually bookmark things. But here's the twist - instead of showing users their entire queue, **we show ONE random link at a time**.

### 🎲 The Key Innovation: Random Delivery

When you open the extension or get a notification, you see a single item with a one-sentence AI summary. Three choices: accept and read it now, skip to see another random one, or delete it. No overwhelming lists, no choice paralysis - just one thing to decide on.

### Why This Actually Works

The randomization creates serendipity. That article you saved three weeks ago resurfaces when you're actually in the mood to read. The AI summary gives just enough context to decide without spoiling the content. It's curated consumption on your own terms.

### What Makes This Different

- **Not just a bookmark manager** - we intercept browsing to enforce intentional consumption
- **Not just a reading list** - random delivery + AI summaries turn saved content into a feed you actually want to check
- **Not just a blocker** - it saves what you wanted for a better time instead of saying "no"

### TL;DR

We're turning "read it later" into "read it when it matters" through randomization and context. Modern tech stack, achievable scope, and something we'd actually use ourselves.

---

## 📖 PART 2: PROJECT DESCRIPTION

### What It Is

A browser extension and web dashboard for intentional content consumption. Users save links to read later, then receive them randomly one at a time with AI-generated summaries.

### 🚀 PRODUCTIVITY MODE

**What It Does**
- User selects distracting sites to block (Reddit, YouTube, etc.)
- Clicking any link on blocked sites intercepts navigation
- Shows "Saved for later" interstitial page
- Link automatically saved to queue for later

**User Controls**
- Quick toggle to temporarily bypass blocking
- Add/remove sites from block list anytime
- Disable productivity mode entirely if needed

**Goal**
Forces delayed consumption instead of instant gratification. You still see the content, just at a better time.

### 🎨 FUN MODE

**What It Does**
- Manual bookmarking via extension icon
- Normal browsing behavior, no blocking
- Click the icon on any page to save it

**Use Case**
For when you're browsing intentionally but still want to save things for later.

### 🎰 RANDOM DELIVERY (Core Mechanic)

**Extension Popup Experience**
- Shows ONE random link from your queue
- Includes one-sentence AI summary
- Three action buttons:
    - **Accept** → Opens link and removes from queue
    - **Skip** → Shows another random link (current one stays in queue)
    - **Delete** → Removes link permanently
- Quick link to "Search queue on dashboard →" for finding specific items

**Why Random?**
- No choice paralysis from seeing hundreds of links
- Serendipity - rediscover things you forgot about
- Forces you to engage with saved content
- Feels like a curated feed, not a chore

### 🌐 WEB DASHBOARD

**Full Queue Management**
- See all saved links in one place
- Search by title or URL
- Filter by date added
- Sort options (newest, oldest, unread)
- Bulk actions (delete multiple, mark as read)

**Settings & Privacy**
- Toggle AI summaries on/off
- Manage blocked sites list
- Export queue as JSON
- Delete account and all data
- View privacy policy

**Why Both Extension + Website?**
- Extension = quick random delivery on-the-go
- Website = power users who need to search/manage queue

### 🤖 AI SUMMARIES

**How It Works**
- One-sentence summary for each saved link
- Generated via Gemini API (free tier)
- **Opt-in only** - disabled by default
- Clear disclosure about sending content to Google

**Privacy Protection**
- API calls happen server-side (API key never exposed)
- Sensitive domains auto-excluded (email, banking, healthcare)
- Can be disabled anytime
- If summary fails, link still saved without it

### 🔐 PRIVACY FIRST

**What We Collect**
- URLs and page titles
- AI summaries (only if opted in)
- Timestamps and read status

**What We DON'T Collect**
- No analytics or tracking
- No browsing history beyond saved links
- Sensitive sites auto-excluded from scraping

**User Controls**
- Delete individual links
- Clear all data
- Export queue as JSON
- Delete account (permanent data removal)

---

## 🛠️ PART 3: TECHNICAL BREAKDOWN

### Tech Stack Overview

**Extension**: React + Vite + shadcn/ui + webextension-polyfill
**Backend**: Supabase (Database + Auth + Edge Functions)
**Website**: React + Vite + shadcn/ui (shared components!)
**AI**: Gemini API (free tier, opt-in only)

### Extension Stack (Chrome/Firefox)

- **Framework**: React + Vite + shadcn/ui (shared with website!)
- **Cross-browser**: webextension-polyfill library
- **Manifest**: V3 for Chrome/Firefox compatibility
- **Content Extraction**: Readability.js for clean text
- **Sync & Auth**: Supabase JavaScript client
- **Click Interception**: Content scripts using addEventListener (capture phase)

### Backend Architecture

**Platform**: Supabase (all-in-one solution)
- PostgreSQL database
- JWT-based authentication
- Row-level security for multi-user data isolation
- Real-time subscriptions for instant sync
- Edge Functions for server-side operations

**LLM Integration**: Edge Function calls Gemini API (keeps API key secure)

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

Query uses age-weighted randomization (older links get slightly higher probability) to help surface forgotten content.

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

---

## 🔒 PART 4: PRIVACY & SECURITY

### 🤖 AI Summary Privacy

- **Opt-in only** - disabled by default
- Clear disclosure: "Send page content to Google Gemini for summaries"
- Backend-only API calls - API key never exposed to client
- Users can disable at any time

### 🚫 Sensitive Domain Protection

Hard-coded blocklist prevents scraping from:
- Email services (Gmail, Outlook)
- Banking websites
- Healthcare portals
- Any other sensitive domains

These sites can still be saved (URL only), just no content scraping or summary generation.

### 📊 Data Collection & Storage

**What We Collect**
- URLs and page titles
- AI summaries (only if user opts in)
- Timestamps and read status

**Where It's Stored**
- Supabase PostgreSQL database
- Row-level security ensures users only see their own data

**Third-party Services**
- Google Gemini (only if LLM summaries enabled)

### ⚙️ User Privacy Controls

- Delete individual links
- Clear all data button
- Export queue as JSON
- Delete account (removes all user data permanently)
- Toggle AI summaries on/off

### 📜 Privacy Policy

- Required for Chrome/Firefox extension stores
- Discloses: data collected, storage location, third-party services
- Clear retention policy (data kept until user deletes)
- No analytics or usage tracking

### 🔒 Security Measures

- Row-level security policies in Supabase
- JWT-based authentication
- API keys stored server-side only
- HTTPS for all communications

---

## 🐛 EDGE CASES & HANDLING

### Duplicate Links
- Show user a duplicate notification
- Do NOT save duplicate to queue
- URL matching check before saving

### LLM Summary Failures
- Don't include summary (leave empty/null)
- No fallback to meta description
- User can still see URL and decide

### Content Scraping Failures
- Still save URL without summary
- Better to have the link than lose it entirely

### Offline/Backend Issues
- Extension saves to local storage first
- Syncs to Supabase when connection restored
- Show error notification if backend unreachable

### Gemini Rate Limits
- Queue summaries for retry
- Or save without summary as fallback
- Free tier limits are fine for our scale

### SPA Navigation Issues
- May need to hook window.history.pushState for some sites
- Test and iterate based on blocked site behavior

---

## ✨ STRETCH GOALS

If we have extra time, we'd like to add:

### RSS Auto-Population
- Support for YouTube, Medium, Substack feeds
- Daily check for new content from user-added feeds
- Manual feed addition only (no AI suggestions)

### Scheduled Notifications
- User sets preferred notification time
- Delivers random link from queue

### Local-Only Mode
- Option to disable cloud sync
- All data stays on device

### Usage Stats Dashboard
- Links saved/read over time
- Most productive times
- Reading patterns

---

## 💡 IDEAS TO ADD

### Auth & Onboarding
- Google OAuth sign-in (currently just says "Supabase Auth" with no specifics)

### Content Handling
- Platform-specific handlers (YouTube API for video descriptions, Reddit-specific scraping for threads)
- Content script injection timing fix: `run_at: "document_start"` in manifest

### Queue Management
- Tags/categories system (work, fun, learn, etc.) for filtering random delivery
- "Read Later Today" priority/pinned queue for urgent links
- Link expiration/auto-archive after 6 months
- Separate "mark as read" status vs permanent delete

### Platform Clarity
- Explicitly document: Desktop extension only (Chrome/Firefox on Windows/Mac/Linux)

---

## ✅ MUST-HAVE FEATURES

- [ ] Dual mode (Productivity + Fun)
- [ ] Click interception & auto-save
- [ ] Random one-at-a-time delivery
- [ ] AI summaries with Accept/Skip/Delete
- [ ] Web dashboard for queue management
- [ ] Desktop-only extension (Chrome/Firefox)
- [ ] Cloud sync across desktop devices
- [ ] Privacy controls & opt-in AI

---

## 📌 PROJECT SCOPE SUMMARY

### Must-Have (Core Features) ✅

- Dual-mode operation (Productivity + Fun)
- Click interception and link saving
- Random one-at-a-time delivery
- AI-generated summaries (opt-in)
- Web dashboard with full queue view
- Cross-device sync
- Privacy controls and policy

### Nice-to-Have (Time Permitting) ⏸️

- RSS feed auto-population
- Scheduled notifications
- Local-only mode
- Usage statistics

### Why This Project Is Cool

We're combining browser extension APIs, content script injection, modern React frontend (extension + website with shared components!), backend infrastructure, LLM integration, real-time sync, and privacy-conscious data handling. It's solving a real behavior problem that we all have, and it's something we'd actually want to use after we build it.
