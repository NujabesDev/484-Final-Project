READ LATER EXTENSION

*Random delivery. AI summaries. Actually read stuff.*

---

## START HERE FOR CODING

[🎯 Barebones MVP Roadmap](https://www.notion.so/Barebones-MVP-Roadmap-286598aa262f8024acbbed4d626de3f6?pvs=21)

## 📚 Project Documentation

[PART 1 : ELEVATOR PITCH](https://www.notion.so/PART-1-ELEVATOR-PITCH-286598aa262f80968842c76c4f898a0d?pvs=21)

The problem, our solution, and why this is cool

[**PART 2: PROJECT DESCRIPTION**](https://www.notion.so/PART-2-PROJECT-DESCRIPTION-286598aa262f8046a69fcd92ea30b5df?pvs=21)

Features, modes, and core mechanic

[PART 3: TECHNICAL BREAKDOWN](https://www.notion.so/PART-3-TECHNICAL-BREAKDOWN-286598aa262f800d888fc795b13d5a74?pvs=21)

Tech stack and how we're building it

[PART 4: PRIVACY & SECURITY](https://www.notion.so/PART-4-PRIVACY-SECURITY-286598aa262f8031849ad50f774a59e7?pvs=21)

Privacy approach, edge cases, and stretch goals

---

## 💡 Ideas To Add

**Auth & Onboarding**

- Google OAuth sign-in (currently just says "Supabase Auth" with no specifics)

**Content Handling**

- Platform-specific handlers (YouTube API for video descriptions, Reddit-specific scraping for threads)
- Content script injection timing fix: `run_at: "document_start"` in manifest

**Queue Management**

- Tags/categories system (work, fun, learn, etc.) for filtering random delivery
- "Read Later Today" priority/pinned queue for urgent links
- Link expiration/auto-archive after 6 months
- Separate "mark as read" status vs permanent delete

**Platform Clarity**

- Explicitly document: Desktop extension only (Chrome/Firefox on Windows/Mac/Linux)

---

## 🎯 The Core Idea

**What We're Building**
Browser extension that saves links for later, then shows you ONE random link at a time with an AI summary

**Two Modes**

- **Productivity Mode**: Blocks distracting sites, auto-saves links
- **Fun Mode**: Manual bookmark button

**The Magic**
Random delivery + AI summaries = actually reading saved stuff instead of hoarding

---

## 🛠️ Tech Stack

**Extension**: React + Vite + shadcn/ui + webextension-polyfill

**Backend**: Supabase (Database + Auth + Edge Functions)

**Website**: React + Vite + shadcn/ui (shared components!)

**AI**: Gemini API (free tier, opt-in only)

---

## ✅ Must-Have Features

- [ ]  Dual mode (Productivity + Fun)
- [ ]  Click interception & auto-save
- [ ]  Random one-at-a-time delivery
- [ ]  AI summaries with Accept/Skip/Delete
- [ ]  Web dashboard for queue management
- [ ]  Desktop-only extension (Chrome/Firefox)
- [ ]  Cloud sync across desktop devices
- [ ]  Privacy controls & opt-in AI

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
