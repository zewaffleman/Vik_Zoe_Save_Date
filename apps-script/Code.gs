/**
 * Vik & Zoe · Save the Date → Google Sheet
 *
 * Paste this into the Sheet's Apps Script editor (Extensions → Apps Script),
 * then Deploy → New deployment → Web app. Full steps in README.md.
 *
 * Receives the form as JSON and appends ONE ROW PER PERSON. Everyone sent in
 * the same form shares a Party ID; "Submitted by" is the main guest.
 * Updates from the same browser reuse the Party ID and are marked
 * "Resubmission: Yes", so you can de-dupe in the Sheet later.
 */

const SHEET_NAME = 'Guests';
const MAX_PEOPLE = 10; // keep in sync with DETAILS.form.maxPeople
const HEADERS = [
  'Submitted at',
  'Party ID',
  'Submitted by',
  'Role',
  'First name',
  'Last name',
  'Email',
  'Phone',
  'Wants updates',
  'Update via',
  'Resubmission',
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // two guests submitting at once won't clash
  try {
    const data = JSON.parse(e.postData.contents);

    // Honeypot: real people never see the "website" field. Pretend it worked.
    if (data.website) return json({ ok: true });

    const people = Array.isArray(data.people) ? data.people.slice(0, MAX_PEOPLE) : [];
    if (!people.length || !people.every((p) => clean(p.first) && clean(p.last))) {
      return json({ ok: false, error: 'Missing names' });
    }

    const sheet = getSheet();
    const now = new Date();
    const main = people[0];
    const updates = data.updates || {};
    const rows = people.map((p, i) => [
      now,
      clean(data.partyId),
      `${clean(main.first)} ${clean(main.last)}`,
      i === 0 ? 'Main guest' : 'Guest',
      clean(p.first),
      clean(p.last),
      clean(p.email),
      cleanPhone(p.phone),
      i === 0 ? (updates.optIn ? 'Yes' : 'No') : '',
      i === 0 && updates.optIn ? (updates.channels || []).map(clean).join(', ') : '',
      data.resubmission ? 'Yes' : '',
    ]);
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Visit the web app URL in a browser to check it's live. */
function doGet() {
  return json({ ok: true, message: 'Vik & Zoe save-the-date endpoint is running.' });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.getRange('H:H').setNumberFormat('@'); // phone numbers stay text (keeps the leading 0 / +)
  }
  return sheet;
}

/**
 * Trim, cap length, and stop "formula injection": a value starting with
 * = + - @ would otherwise be run as a formula when the Sheet opens.
 */
function clean(v) {
  let s = String(v == null ? '' : v).trim().slice(0, 200);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return s;
}

/** Phones may start with "+" (country code): the column is plain text, so that's safe. */
function cleanPhone(v) {
  let s = String(v == null ? '' : v).trim().slice(0, 40);
  if (/^[=@]/.test(s)) s = `'${s}`;
  return s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
