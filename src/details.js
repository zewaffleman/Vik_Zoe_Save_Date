/**
 * ============================================================================
 *  DETAILS: every piece of wedding information and wording on the site.
 * ============================================================================
 *
 *  Edit this file to change names, dates, the venue, links or any text on
 *  the info card and form. Animation settings live in config.js instead.
 *
 *  After editing, the page reloads by itself. (The calendar file,
 *  wedding.ics, is generated from this too. If you're running `npm run dev`,
 *  restart it to see .ics changes.)
 * ============================================================================
 */

export const DETAILS = {
  couple: 'Vik & Zoe',
  tagline: 'are getting married',

  // The day itself. It's an ALL-DAY event in calendars; times come later with
  // the formal invitation.
  date: '2027-08-22', // YYYY-MM-DD
  dateLine: '22 · 08 · 2027', // how it's written on the title screen
  city: 'Brisbane, Australia',
  timeNote: 'All day · times to follow with your invitation',
  note: '',

  venue: {
    name: 'The Summit Restaurant',
    area: 'Mount Coot-tha',
    address: '1/1012 Sir Samuel Griffith Dr, Mount Coot-tha QLD 4066',
  },

  // Dress code & vibes
  pinterest: {
    url: 'https://pin.it/4V0MDSbke', 
    label: 'Dress code & vibes',
    button: 'See the mood board',
  },

  // Calendar entry (Google Calendar link + wedding.ics for Apple/Outlook)
  calendar: {
    title: "Vik & Zoe's Wedding",
    description: 'Save the date! Formal invitation (with times) to follow.',
    fileName: 'wedding.ics', // served next to the page
  },

  // Where the site lives once deployed (added to the calendar description)
  siteUrl: 'https://zewaffleman.github.io/Vik_Zoe_Save_Date/',

  // --------------------------------------------------------------------------
  //  THE FORM → Google Sheet
  // --------------------------------------------------------------------------
  form: {
    // Your Google Apps Script web app URL (see apps-script/README.md).
    // Leave '' for TEST MODE: the form works but only logs to the console.
    endpoint: 'https://script.google.com/macros/s/AKfycbwIgcGHf-B4g3HIToFoiMBiIcsvPYvf9yxWYa4GyYH8mAhgl1mFeS6tnhISXycGqeobcA/exec',
    replyBy: '2026-12-31', // shown as "Please let us know by …"
    maxPeople: 10, // including the main guest

    // "Add someone" (extra guests) only shows on the family link:
    //   …/family/  or  …/?family
    // Everyone else gets a one-person form. Once a phone has opened the
    // family link, it keeps the button (even via the plain link later).
    // Testing both on one phone? Open …/?family=0 to forget it.
    familyFlag: 'family',

    heading: "Let us know you're in",
    intro: 'Your formal invitation will follow. For now, just leave your details so we can keep you in the loop.',
    introFamily: "Your formal invitation will follow. For now, just leave your details (and who's coming with you) so we can keep you in the loop.",
    you: 'You',
    guest: 'Guest', // "Guest 2", "Guest 3"…
    addPerson: 'Add someone',
    submit: 'Count me in',
    sending: 'Sending…',

    updates: {
      label: 'Keep me posted',
      optIn: "Yes, I'd like the occasional wedding update",
      howLabel: 'How should we reach you?',
      channels: ['Email', 'SMS', 'WhatsApp'],
      privacy: "Optional.",
    },

    success: {
      heading: "You're on the list!",
      body: 'Thanks {names}. Keep an eye out for your invitation.',
      edit: 'Update our details',
    },
    error: "Hmm, that didn't send. Please check your connection and try again.",
    timeout: 15, // seconds before a submission is treated as failed
  },
};
