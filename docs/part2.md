PART 2: PROJECT DESCRIPTION
### What It Is

A browser extension and web dashboard for intentional content consumption. Users save links to read later, then receive them randomly one at a time with AI-generated summaries.

---

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

---

### 🎨 FUN MODE

**What It Does**

- Manual bookmarking via extension icon
- Normal browsing behavior, no blocking
- Click the icon on any page to save it

**Use Case**
For when you're browsing intentionally but still want to save things for later.

---

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

---

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

---

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

---

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