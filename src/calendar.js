/**
 * CALENDAR + MAPS LINKS, built from DETAILS.
 *
 * Pure functions (no DOM), so vite.config.js can reuse buildIcs() to write
 * a real `wedding.ics` file at build time. A real file served as
 * text/calendar is what makes iPhones show the "Add to Calendar" sheet;
 * generated blob downloads tend to land in Files instead.
 *
 * It's an ALL-DAY event, so dates have no time and no time zone. That's
 * correct: the 22nd stays the 22nd wherever a guest's phone is.
 */

const ymd = (iso) => iso.replaceAll('-', ''); // 2027-08-22 → 20270822

/** The day after an ISO date (all-day events end on the following day). */
function nextDay(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const fullAddress = (d) => `${d.venue.name}, ${d.venue.address}`;
const description = (d) => `${d.calendar.description}\n${d.siteUrl}`;

export function googleCalendarUrl(d) {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: d.calendar.title,
    dates: `${ymd(d.date)}/${ymd(nextDay(d.date))}`,
    details: description(d),
    location: fullAddress(d),
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function mapsUrls(d) {
  const q = fullAddress(d);
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
    apple: `https://maps.apple.com/?q=${encodeURIComponent(d.venue.name)}&address=${encodeURIComponent(d.venue.address)}`,
  };
}

/**
 * Best maps link for this device: Apple Maps on iPhone/iPad, Google Maps
 * everywhere else. On Android the Google Maps link opens the Maps app when
 * it's installed (it's an "app link") and the website when it isn't. We
 * avoid geo: links: browsers without a handler for them (desktop Chrome in
 * phone emulation, some in-app browsers) just throw an error.
 */
export function bestMapsLink(d, ua = navigator.userAgent) {
  const m = mapsUrls(d);
  const iOS = /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); // iPadOS says "Mac"
  if (iOS) return { href: m.apple, newTab: false };
  if (/Android/i.test(ua)) return { href: m.google, newTab: false }; // same tab → hands straight to the Maps app
  return { href: m.google, newTab: true };
}

// --- .ics (RFC 5545) ----------------------------------------------------------

/** Escape text values: backslash, comma, semicolon, newline. */
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n');

/** Lines must be ≤ 75 octets; longer ones continue on a line starting with a space. */
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = '';
  let len = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (len + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      len = 0;
    }
    cur += ch;
    len += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function buildIcs(d, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); // 20261019T010203Z
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vik & Zoe//Save the Date//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:wedding-${ymd(d.date)}@vik-zoe-save-the-date`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(d.date)}`,
    `DTEND;VALUE=DATE:${ymd(nextDay(d.date))}`,
    `SUMMARY:${esc(d.calendar.title)}`,
    `LOCATION:${esc(fullAddress(d))}`,
    `DESCRIPTION:${esc(description(d))}`,
    `URL:${d.siteUrl}`,
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
