# Architecture

## What is this
Browser extension + website for saving links and getting them back randomly. Solves choice paralysis.

Tech: React, Javascript, Firebase (Auth + Firestore), Manifest V3

## Diagram Components
- User (browser)
- Extension (Chrome/Firefox)
- Website (React app on Vercel)
- Firebase (Auth + Firestore)

## Two parts

**Extension** - 90% of usage
- Save/delete/open links
- Show random link from queue
- Productivity mode: intercepts Reddit/YouTube clicks, auto-saves instead of navigating
- Needs Google auth

**Website** - 10% + stats
- Does everything extension does
- Archive of all saved links
- Stats: total links, time saved, sorting

## How it works

**Storage:** Everything in Firestore `users/{userId}/links`
- Extension reads/writes directly
- Website reads/writes directly
- Real-time sync via listeners

**Each link:**
- url, title, timestamp, createdAt
- status: 'active' | 'opened' | 'deleted'
- openedAt, deletedAt (timestamps or null)
- Soft delete - keeps history for stats

**Auth:**
- Extension can't do OAuth popup, so opens website
- Website does Google OAuth, sends token back via postMessage
- Extension stores it in chrome.storage.local
- Both use same Firebase project

## MVP by Week 13

**Core functionality (complete):**
- Extension: save links, show random link, delete/open
- Google auth
- Firestore storage
- Productivity mode (intercept Reddit/YouTube clicks)

**Needs implementation:**
- Website: basic dashboard showing queue
- Soft delete with status tracking (status, openedAt, deletedAt fields)

**Post-MVP:**
- AI summaries
- Stats/analytics dashboard
- Archive view with sorting/filtering

## Later: AI summaries

Firebase AI Logic SDK - calls Gemini from client side
- Save link → call Gemini → get summary + categories → save to Firestore
- Free tier: 1000 requests/day (Flash-Lite)
- Add fields: aiSummary, categories


 Removed the bloat:
    - ❌ Toast notification styles (100+ lines)
    - ❌ Complex keyframe animations (fadeIn, slideOut, checkmark, pulse)
    - ❌ Progress indicator styles
    - ❌ Timestamp display styles
    - ❌ Favicon styles
    - ❌ Fixed bottom auth bar complexity
    - ❌ Excessive padding/spacing
