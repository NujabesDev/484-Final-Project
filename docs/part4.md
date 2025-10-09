PART 4: PRIVACY & SECURITY

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

## ✨STRETCH GOALS

If we have extra time, we'd like to add:

**RSS Auto-Population**

- Support for YouTube, Medium, Substack feeds
- Daily check for new content from user-added feeds
- Manual feed addition only (no AI suggestions)

**Scheduled Notifications**

- User sets preferred notification time
- Delivers random link from queue

**Local-Only Mode**

- Option to disable cloud sync
- All data stays on device

**Usage Stats Dashboard**

- Links saved/read over time
- Most productive times
- Reading patterns