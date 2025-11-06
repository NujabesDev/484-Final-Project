# Queue System Design

Simple explanation of how the shuffle queue should work.

---

## How It Works

**Like Spotify Shuffle:** Never see the same link twice until you've seen them all.

---

## Behavior

### Loading Links
- Load all links from Firestore
- Shuffle into random order
- Show first link

### Next Button
- Show next link in shuffled queue
- When you reach the end → auto-reshuffle into new random order
- Start over with fresh shuffle

### Adding Links
- New link inserts at random position in the queue
- Keeps things unpredictable

### Deleting Links
- If you delete the current link → move to next link
- If you delete a different link → stay on current link
- If no links left → show "No links saved" message

### Session Persistence
- Queue persists while browser is open (close/reopen popup = same spot)
- Browser restart = fresh shuffle

---

## Important Technical Detail

**Track by link ID, not array index**
- When you add/delete links, array positions shift
- Using ID prevents bugs where you lose your place

---

## What User Sees

✅ Current link (title, URL)
✅ "Next" button
✅ "Delete" button

❌ Don't show shuffle order (keep it mysterious)
❌ Don't show progress like "3 of 10"

---

## Key Decisions

- Track by link ID (not index)
- Session persistence (clears on browser restart)
- Auto-reshuffle when reaching end
- Insert new links at random position
- Move to next when deleting current link
- Keep shuffle order hidden

---

## Result

Smooth Spotify-like experience with no repeated links in a session.


add local storage next time too yea
