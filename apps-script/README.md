# Connecting the form to a Google Sheet

About 5 minutes, once. You'll end up with a web app URL to paste into
`src/details.js`.

## 1. Make the Sheet

1. Go to <https://sheets.new> (signed in as whoever should own the guest list).
2. Name it, e.g. **Vik & Zoe · Save the date**.
3. You don't need to add headers: the script creates a **Guests** tab with
   headers on the first submission.

## 2. Add the script

1. In the Sheet: **Extensions → Apps Script**.
2. Delete what's in `Code.gs` and paste in everything from
   [`apps-script/Code.gs`](./Code.gs).
3. Click 💾 **Save**.

## 3. Deploy it as a web app

1. **Deploy → New deployment**.
2. Click the ⚙️ next to "Select type" → **Web app**.
3. Set:
   - **Description:** `Save the date form`
   - **Execute as:** **Me** (the script writes to *your* Sheet)
   - **Who has access:** **Anyone** (guests aren't signed in to Google; this
     only lets them *send* to the script, not see the Sheet)
4. **Deploy** → **Authorize access** → choose your account.
   - Google will warn "Google hasn't verified this app". That's normal for
     your own script: **Advanced → Go to (project name) (unsafe) → Allow**.
5. Copy the **Web app URL** (ends in `/exec`).

## 4. Plug it in

In `src/details.js`:

```js
form: {
  endpoint: 'https://script.google.com/macros/s/XXXX/exec',
```

Commit and push; the site redeploys. Until this is set, the form runs in
**test mode** (it logs what it would send to the browser console instead).

## 5. Test it

- Open the web app URL in a browser: you should see
  `{"ok":true,"message":"…endpoint is running."}`
- Submit the form on the site → a row per person appears in **Guests**.

## Good to know

- **Changing the script later:** saving isn't enough. Use **Deploy → Manage
  deployments → ✏️ → Version: New version → Deploy**. Doing it this way
  keeps the same URL. ("New deployment" would give you a new URL.)
- **Why no CORS errors:** the site sends the form as `text/plain`, which
  browsers send without a "preflight" check (Apps Script can't answer
  those). Apps Script replies via a redirect to `googleusercontent.com`,
  which allows cross-site reads, so the page can show "sent" or "failed"
  without opening a new tab.
- **Spam:** a hidden "website" field catches bots; anything with it filled
  in is accepted silently but not saved.
- **Columns:** Submitted at · Party ID · Submitted by · Role · First name ·
  Last name · Email · Phone · Wants updates · Update via · Resubmission.
  Everyone from one form shares a Party ID. When the same browser sends
  again ("Update our details"), the rows reuse that Party ID with
  Resubmission = Yes, so you can keep the newest and delete the rest.
- **Privacy:** only what's in the form is stored. The site keeps a small
  "already sent" cookie (party ID + first names) on the guest's own phone so
  they see "You're on the list" next time, plus their details in local
  storage so they can edit. Nothing else is tracked.
