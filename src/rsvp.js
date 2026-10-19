/**
 * THE "LET US KNOW" FORM → Google Sheet, without leaving the page.
 *
 * - Main guest (first, last, email, phone). On the FAMILY link only
 *   (…/family/ or ?family), up to DETAILS.form.maxPeople − 1 extra people
 *   via the "+" button (name required; email/phone optional).
 * - Optional "keep me posted" opt-in with a choice of Email / SMS / WhatsApp
 *   (choosing SMS or WhatsApp makes the phone number required).
 * - Standard email + phone checks, shown inline next to each field.
 * - A hidden "honeypot" field: bots fill it in, people never see it.
 * - Sends with fetch(); the card shows "sending…", then success or a retry
 *   message. In TEST MODE (no endpoint set) it just logs what it would send.
 *
 * Remembering the guest (to cut down on duplicate submissions):
 * - While typing: a draft is kept in this browser (localStorage), so closing
 *   the card by accident doesn't lose anything.
 * - After sending: a small cookie marks this browser as "already sent"
 *   (party ID + first names only, never emails or phone numbers, because
 *   cookies travel to the web host with every request). The full details
 *   stay in localStorage so "Update our details" can prefill the form.
 *   An update re-sends with the same party ID, marked as a resubmission,
 *   so it's easy to spot in the Sheet.
 */
import { gsap } from 'gsap';
import { DETAILS } from './details.js';

const F = DETAILS.form;
const DRAFT_KEY = 'std-rsvp-draft';
const SENT_KEY = 'std-rsvp-sent';
const COOKIE = 'std_rsvp';
const FAMILY_KEY = 'std-family';

/**
 * Is this guest allowed to add extra people? Yes if the URL is …/family/ or
 * has ?family (on GitHub Pages, /family/ forwards to ?family), or this phone
 * has opened the family link before. ?family=0 makes this browser forget it.
 */
function familyMode() {
  const param = new URLSearchParams(location.search).get(F.familyFlag); // null if absent
  // ?family=0 (or =off / =false) → forget it on this browser (handy for testing)
  if (param !== null && /^(0|off|false|no)$/i.test(param)) {
    store.remove(FAMILY_KEY);
    return false;
  }
  const flagged = param !== null || new RegExp(`/${F.familyFlag}/?$`).test(location.pathname); // /family/ itself (e.g. in dev)
  if (flagged) {
    store.set(FAMILY_KEY, true);
    return true;
  }
  return store.get(FAMILY_KEY) === true;
}

// --- validation -------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Phone: allow spaces, dashes, dots, brackets and a leading +; 8–15 digits. */
const cleanPhone = (v) => v.replace(/[\s\-().]/g, '');
const PHONE_RE = /^\+?\d{8,15}$/;

// --- tiny storage helpers (all wrapped: private mode can throw) -------------
const store = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
function setCookie(value, days = 365) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  // Path = this site's folder (e.g. /Vik_Zoe_Save_Date/), not the whole of
  // username.github.io, which other projects share.
  const path = location.pathname.replace(/[^/]*$/, '') || '/';
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${days * 86400}; Path=${path}; SameSite=Lax${secure}`;
}
function getCookie() {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

const partyId = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).slice(0, 13);

const joinNames = (names) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} & ${names.at(-1)}`;

// ----------------------------------------------------------------------------

export function initRsvp(root, { reduced = false } = {}) {
  const form = root.querySelector('form');
  const done = root.querySelector('.rsvp-done');
  const guests = form.querySelector('.rsvp-guests');
  const tpl = root.querySelector('#guest-template');
  const addBtn = form.querySelector('[data-add-guest]');
  const optIn = form.querySelector('[name="updates"]');
  const channels = form.querySelector('.rsvp-channels');
  const submit = form.querySelector('[type="submit"]');
  const status = form.querySelector('.rsvp-status');

  // ---- wording from DETAILS
  const text = (sel, t) => root.querySelectorAll(sel).forEach((el) => (el.textContent = t));
  text('[data-f="heading"]', F.heading);
  const family = familyMode();
  root.classList.toggle('is-family', family);
  text('[data-f="intro"]', family ? F.introFamily : F.intro);
  text('[data-f="replyBy"]', `Please let us know by ${new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${F.replyBy}T00:00:00Z`))}`);
  text('[data-f="you"]', F.you);
  text('[data-f="add"]', F.addPerson);
  text('[data-f="updatesLabel"]', F.updates.label);
  text('[data-f="optIn"]', F.updates.optIn);
  text('[data-f="howLabel"]', F.updates.howLabel);
  text('[data-f="privacy"]', F.updates.privacy);
  text('[data-f="successHeading"]', F.success.heading);
  text('[data-f="edit"]', F.success.edit);
  submit.textContent = F.submit;
  channels.querySelector('.rsvp-channel-list').innerHTML = F.updates.channels
    .map((c) => `<label class="check"><input type="checkbox" name="channel" value="${c}" /><span>${c}</span></label>`)
    .join('');

  // ---- extra guests ---------------------------------------------------------
  let guestSeq = 0;
  function renumber() {
    [...guests.children].forEach((row, i) => (row.querySelector('legend').textContent = `${F.guest} ${i + 2}`));
    const full = guests.children.length + 1 >= F.maxPeople;
    addBtn.hidden = !family || full;
  }
  function addGuest(values = {}, { animate = true } = {}) {
    if (guests.children.length + 1 >= F.maxPeople) return null;
    const row = tpl.content.firstElementChild.cloneNode(true);
    const n = ++guestSeq;
    // unique ids so each label points at its own input
    row.querySelectorAll('[data-id]').forEach((el) => {
      el.id = `${el.dataset.id}-${n}`;
    });
    row.querySelectorAll('label[data-for]').forEach((l) => (l.htmlFor = `${l.dataset.for}-${n}`));
    row.querySelectorAll('input').forEach((input) => {
      input.value = values[input.name] ?? '';
      input.setAttribute('aria-describedby', `${input.id}-err`);
      input.nextElementSibling.id = `${input.id}-err`;
    });
    row.querySelector('[data-remove]').addEventListener('click', () => removeGuest(row));
    guests.appendChild(row);
    renumber();
    if (animate && !reduced) gsap.from(row, { autoAlpha: 0, y: -10, duration: 0.35, ease: 'power2.out' });
    return row;
  }
  function removeGuest(row) {
    const finish = () => {
      row.remove();
      renumber();
      saveDraft();
      addBtn.focus();
    };
    if (reduced) finish();
    else gsap.to(row, { autoAlpha: 0, height: 0, marginTop: 0, duration: 0.25, ease: 'power2.in', onComplete: finish });
  }
  addBtn.addEventListener('click', () => {
    const row = addGuest();
    row?.querySelector('input')?.focus();
    saveDraft();
  });

  // ---- updates opt-in shows the channel choices -----------------------------
  const syncChannels = () => (channels.hidden = !optIn.checked);
  optIn.addEventListener('change', syncChannels);

  // ---- read / fill the form ---------------------------------------------------
  const person = (scope) => ({
    first: scope.querySelector('[name="first"]').value.trim(),
    last: scope.querySelector('[name="last"]').value.trim(),
    email: scope.querySelector('[name="email"]').value.trim(),
    phone: scope.querySelector('[name="phone"]').value.trim(),
  });
  const mainScope = form.querySelector('.rsvp-main');
  function read() {
    return {
      people: [person(mainScope), ...[...guests.children].map(person)],
      updates: {
        optIn: optIn.checked,
        channels: optIn.checked ? [...form.querySelectorAll('[name="channel"]:checked')].map((c) => c.value) : [],
      },
    };
  }
  function fill(data) {
    if (!data?.people?.length) return;
    const [main, ...rest] = data.people;
    for (const k of ['first', 'last', 'email', 'phone']) mainScope.querySelector(`[name="${k}"]`).value = main[k] ?? '';
    guests.innerHTML = '';
    rest.forEach((p) => addGuest(p, { animate: false }));
    optIn.checked = !!data.updates?.optIn;
    form.querySelectorAll('[name="channel"]').forEach((c) => (c.checked = data.updates?.channels?.includes(c.value)));
    syncChannels();
  }

  // ---- draft autosave ---------------------------------------------------------
  function saveDraft() {
    store.set(DRAFT_KEY, read());
  }
  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);

  // ---- validation -------------------------------------------------------------
  function setError(input, msg) {
    const err = input.nextElementSibling;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    err.textContent = msg || '';
  }
  function validate() {
    const wantsPhone = form.querySelectorAll('[name="channel"]:checked').length &&
      [...form.querySelectorAll('[name="channel"]:checked')].some((c) => c.value !== 'Email');
    const scopes = [mainScope, ...guests.children];
    let firstBad = null;
    scopes.forEach((scope, i) => {
      const isMain = i === 0;
      for (const input of scope.querySelectorAll('input')) {
        const v = input.value.trim();
        let msg = '';
        if (input.name === 'first' || input.name === 'last') {
          if (!v) msg = input.name === 'first' ? 'Please add a first name' : 'Please add a last name';
        } else if (input.name === 'email') {
          if (!v && isMain) msg = "We'll need an email";
          else if (v && !EMAIL_RE.test(v)) msg = "That email doesn't look quite right";
        } else if (input.name === 'phone') {
          if (!v && isMain && optIn.checked && wantsPhone) msg = 'Add a number so we can message you';
          else if (v && !PHONE_RE.test(cleanPhone(v))) msg = 'Use digits, with a country code if outside Australia';
        }
        setError(input, msg);
        if (msg && !firstBad) firstBad = input;
      }
    });
    const chanErr = channels.querySelector('.field-error');
    const noChannel = optIn.checked && !form.querySelector('[name="channel"]:checked');
    chanErr.textContent = noChannel ? 'Pick at least one' : '';
    if (noChannel && !firstBad) firstBad = form.querySelector('[name="channel"]');
    return firstBad;
  }
  // re-check a field when the guest leaves it (only once it's been flagged)
  form.addEventListener('focusout', (e) => {
    if (e.target.getAttribute?.('aria-invalid') === 'true') validate();
  });

  // ---- states -----------------------------------------------------------------
  function showDone(sent, { animate = true } = {}) {
    const names = joinNames(sent.firstNames ?? []);
    done.querySelector('[data-f="successBody"]').textContent = F.success.body.replace('{names}', names || 'you');
    form.hidden = true;
    done.hidden = false;
    root.classList.add('is-done'); // hides the "let us know" intro (CSS)
    if (animate && !reduced) {
      gsap.fromTo(done, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)' });
      gsap.fromTo(done.querySelectorAll('.doodle'), { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(2.5)', stagger: 0.08 });
    }
  }
  function showForm() {
    done.hidden = true;
    form.hidden = false;
    root.classList.remove('is-done');
    status.textContent = '';
  }
  done.querySelector('[data-edit]').addEventListener('click', () => {
    fill(store.get(SENT_KEY)?.data ?? store.get(DRAFT_KEY));
    showForm();
    mainScope.querySelector('input').focus();
  });

  // ---- submit -------------------------------------------------------------------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.classList.remove('is-error');
    const bad = validate();
    if (bad) {
      bad.focus();
      status.textContent = 'A couple of things need a look.';
      status.classList.add('is-error');
      return;
    }
    const data = read();
    const previous = store.get(SENT_KEY);
    const payload = {
      partyId: previous?.partyId ?? partyId(),
      resubmission: !!previous,
      people: data.people,
      updates: data.updates,
      website: form.querySelector('[name="website"]').value, // honeypot
    };

    submit.disabled = true;
    submit.textContent = F.sending;
    try {
      await send(payload);
      const sent = { partyId: payload.partyId, firstNames: data.people.map((p) => p.first), at: new Date().toISOString() };
      setCookie(sent);
      store.set(SENT_KEY, { ...sent, data });
      store.remove(DRAFT_KEY);
      showDone(sent);
    } catch (err) {
      console.warn('[rsvp] send failed', err);
      status.textContent = F.error;
      status.classList.add('is-error');
    } finally {
      submit.disabled = false;
      submit.textContent = F.submit;
    }
  });

  // ---- start: already sent? otherwise restore any draft --------------------------
  const sentMark = getCookie() ?? store.get(SENT_KEY);
  if (sentMark) showDone(sentMark, { animate: false });
  else fill(store.get(DRAFT_KEY));
  renumber();
  syncChannels();
}

/**
 * POST to the Apps Script web app. Sent as text/plain so the browser doesn't
 * do a CORS "preflight" (Apps Script can't answer those); Apps Script then
 * redirects to a googleusercontent.com URL that IS readable cross-origin, and
 * fetch follows it automatically.
 */
async function send(payload) {
  if (!F.endpoint) {
    console.info('[rsvp] TEST MODE (no endpoint in details.js). Would send:', payload);
    await new Promise((r) => setTimeout(r, 800));
    if (new URLSearchParams(location.search).has('formfail')) throw new Error('test failure (?formfail)');
    return;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), F.timeout * 1000);
  try {
    const res = await fetch(F.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
  } finally {
    clearTimeout(timer);
  }
}
