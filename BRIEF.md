# Project: Wedding Save the Date (Wii/Mii-inspired space journey)

## Goal
Build a single-page, mobile-first web app that works as a wedding save-the-date. Guests will mostly open it on their phones from a text message or QR code. It should feel like a charming, hand-animated, Wii/Mii-style mini experience, not a corporate website.

## Status
- [x] 1. Clarifying questions answered (decisions recorded below)
- [x] 2. File structure and animation plan approved
- [x] 3. Build placeholder-asset version with full timeline and config object
- [ ] 4. Iterate on timing and feel (round 1 done: see "Direction update" below)
- [ ] 5. Swap in real assets
- [ ] 6. Build info panel, calendar, and RSVP integration (don't start until animation is approved)
- [ ] 7. Deploy, then final check on real phone sizes

## Event details
All of these live in `src/config.js` so they can be edited in one place.

| Item | Value |
|---|---|
| Couple | Vik & Zoe |
| Date | Sunday 22 August 2027 |
| Start time | 3:00pm **(placeholder, TBC)** |
| End time | 11:00pm (could run to midnight, so keep it editable) |
| Time zone | `Australia/Brisbane` (AEST, UTC+10, no daylight saving) |
| Venue name | The Summit Restaurant, Mount Coot-tha |
| Venue address | 1/1012 Sir Samuel Griffith Dr, Mount Coot-tha QLD 4066 |
| RSVP deadline | 1 December 2026 |
| Extra info | "Invitation to follow". There will be a Pinterest board for dress code and vibes: **placeholder link for now** |

## Direction update (round 1 feedback)
- **Less "app store game".** Hand-drawn look (sketchy ink, paper grain), and a more professional, stationery-style UI.
- **Realistic planets vs drawn characters.** Earth and the destination are real 3D globes (three.js, NASA/USGS public-domain textures) with a cloud layer and atmosphere glow. Everything else is hand-drawn. That contrast is the point.
- **Destination is Io** (Jupiter's volcanic moon; matches the concept board). Pele volcano faces the viewer.
- **Launch from Brisbane:** the Earth globe is turned so Australia shows under the rocket.
- **Round 2:** more whimsy from the concept board on the title and card: vector doodles (thistle aliens, marigolds, jalebi swirls, melted-plate blob, ringed planet, sparkles, squiggles) that boil in step with the art; hand-drawn frames on the date and button; an arch-topped card with a double brass rule. Planets are bigger (Io 520 wide, Earth 800) so the flag and couple read clearly.
- **Round 3: rendered Miis.** The couple are now Vik's own Mii renders (video), not drawings. On Earth they cycle random idles; when it's time they walk (walk loop) into the rocket; on Io they walk out, the flag goes up, then they cycle Io idles. Green-screen MP4/WebM is keyed out live in the browser (WebGL); transparent GIF/WebP also supported. Clip list + key settings in `CONFIG.assets.miis` / `CONFIG.miis`.
- **Round 4:** 11 rendered clips wired in (walks loop their left-facing strides; per-clip mirror + foot alignment; idles held 3–6s; impatient clips after 8s on the title). Vik starts RIGHT of the rocket, Zoe LEFT; on Io they walk out one each side. Earth enlarged (1200) for a longer walk. Flag removed. Passenger heads are keyed video loops seen through the rocket's window.
- **Round 5:** forced-perspective rocket (grows to 1.9× in flight, shrinks to land). Impatience is a 2-minute easter egg with a red "!" over the impatient Mii. Moon wiggle is gentler, waits for 30s of no input, and stops for good once the card has been opened and closed.
- **Two Miis (Vik & Zoe)** board the rocket on Earth and get off on Io, then plant a date flag, walk off, and sit together before the moon invites a tap.

## Storyboard
1. **Title screen:** elegant text on the night sky: "Save the date · Vik & Zoe · are getting married · 22 · 08 · 2027 · Brisbane, Australia" with an understated "Tap to begin". This tap also unlocks browser audio.
2. **Board:** the two Miis walk to the rocket and hop in through the door. Their faces appear in the porthole.
3. **Liftoff:** the rocket crouches, rumbles and launches from Earth (3D globe drops away).
4. **Journey:** the rocket swoops through a parallax starfield (~6s; liftoff + journey ≈ 8s).
5. **Landing:** Io rises into view, the rocket hovers, then touches down with a squash.
6. **Disembark → flag → sit (~3s):** the Miis hop out, Vik plants a flag reading "22.08.27", then they walk off together and sit side by side.
7. **Prompt:** after a short rest the moon wiggles, and a "Tap the moon" hint appears.
8. **Tap reveal:** tapping the moon opens the info card.

### Master timeline plan

| Label | Time (default) | What happens |
|---|---|---|
| `title` | 0–0.7s | Title text drifts up and fades after the tap |
| `board` | 0.7–2.2s | Miis walk to the rocket, hop in, faces pop into the porthole |
| `liftoff` / `launch` | 2.2–4.0s | Crouch, rumble, launch; Earth drops away, stars speed up |
| `journey` | 4.0–10.2s | Swoops and floats through the starfield |
| `landing` / `touchdown` | 10.2–12.4s | Io rises, rocket hovers, drops, squashes |
| `disembark` / `flag` / `sit` | 12.4–16.1s | Miis hop out, flag planted, they walk off and sit |
| `idle` | +1.5s | Rest; the moon becomes tappable |
| `prompt` | loops until tapped | Moon wiggles with decaying amplitude, then repeats; hint appears |

## Art direction

### Feel
Hand-drawn characters and props (sketchy ink, slight misregistration, paper grain) with Mii-inspired proportions, set against photographic 3D planets. Bouncy, stepped character motion; smooth, realistic planet spin. Colours come from the Vik & Zoe concept board (page 3 of `Vik & Zoe_Styling Proposal.pdf`).

### UI
Stationery rather than game menu: Bagel Fat One for the names only; Cormorant Garamond for everything else; tracked small caps labels; thin brass rules; cream paper card with a double inset border. No glossy pill buttons.

### Palette (from the concept board; the final hex values live in config and can be tuned)
| Name | Use |
|---|---|
| Blush | Soft backgrounds, panel accents |
| Lilac | Sky gradient, Earth accents |
| Berry | Sky gradient (dusk), primary buttons |
| Rust | Planet swirls, emphasis |
| Peach | Planet body, highlights |
| Matcha | Earth, secondary accents |
| Brass | Stars, small metallic details |
| Purple (wordmark) | Display type ("VIK & ZOE") |

- **Sky:** deep lilac-to-berry dusk with brass-coloured stars.
- **Planets:** real Earth (with clouds) and Io, lit from the upper left with a lilac fill light so the night side reads as dusk.
- **UI:** cream paper card, brass rules, rust accents, purple names.
- **Nintendo IP:** this is "inspired by" only. Do not use any Nintendo assets, fonts, or music. Use an original rounded font (a Google Font is fine).

### Assets
- All drawn art is hand-drawn by me and supplied as **PNG with transparency** in `public/assets/`. Layers are separate files: rocket, rocket flame, porthole passengers, the two Miis (stand / walk / sit), the flag, star layers, and optional background.
- Earth and Io are **not drawn**: they're 3D globes using textures in `public/assets/textures/` (credits in `CREDITS.md` there).
- **Boil:** each hand-drawn element is supplied as 2–3 slightly different drawings, cycled to create the outline "boil".
- **Rocket flame:** 4 frames, animated as its own layer, separate from the rocket body's boil.
- **Naming convention:**
  - `rocket/rocket_boil1.png`, `rocket_boil2.png`, …
  - `rocket/rocket_flame1.png` … `rocket_flame4.png`
  - `rocket/rocket_passengers1.png`, `rocket_passengers2.png` (faces in the porthole)
  - `miis/mii_a_stand1.png`, `mii_a_stand2.png`, `mii_a_walk1.png`, `mii_a_walk2.png`, `mii_a_sit1.png`, `mii_a_sit2.png` (same for `mii_b_…`). A = Vik, B = Zoe
  - `flag/flag_boil1.png`, `flag_boil2.png` (the date text is HTML over the cloth, set in config)
  - `stars/`, `background/`
- **Placeholders:** until my art arrives, use generated placeholder PNGs with the same filenames and similar proportions. They should be simple shapes with slightly different wobbles, so the boil can be tested now. Swapping in my art should just mean replacing the files.

## Animation feel (most important part)
I want a pseudo hand-animated, Nintendo-quality feel, with real control over timing.
- Use **GSAP** and build the whole sequence as a single master timeline, with each scene as a labelled sub-timeline.
- **Stepped animation ("on twos"):** main character movement runs at **12fps** by default instead of perfectly smooth tweens. The step rate is configurable per element. Stars and UI panels stay smooth; that contrast is what sells the hand-animated look.
- Bouncy easing with squash and stretch on the rocket (liftoff, landing) and the planet.
- Outline "boil" made by cycling the PNG drawings (see Assets).
- Parallax star layers with slow drift; occasional twinkle.
- Planet shake: rotation and scale oscillation with decaying amplitude, repeating gently until tapped.
- **Put ALL timings, easings, fps values, distances, colours, event details, and audio cues in one clearly commented config object** (`src/config.js`) so I can tweak everything myself without re-prompting.
- **`?debug` in the URL** shows a scrubber, play/pause, scene-jump buttons, a speed control (0.25×–2×), and a live readout of the current label and time.
- **`prefers-reduced-motion`:** fall back to a ~2s crossfade from Earth to the planet, with no stepping, shaking, or parallax. The planet shows a gentle "tap me" hint instead of shaking.

## Audio
- Audio files will be provided later. For now, build empty hooks and a mute toggle.
- Audio must only start after the first tap.
- **Scheduling approach:** sound cues are tied to named points in the master timeline (e.g. `liftoff` → whoosh, `landing` → boing, `prompt` → a soft chime). This keeps sound in sync with scrubbing and replay. Adding a sound means dropping the file into `public/assets/audio/` and naming it in the config's cue list. Background music, if any, is one looping track that fades in after the tap.

## Post-tap info panel
The panel slides or pops in with the same bouncy style. Contents, in order:
1. **Venue:** venue name and full address, a copy-address button, and "Open in Google Maps" and "Open in Apple Maps" links.
2. **Add to calendar:** an "Add to Google Calendar" link, plus an `.ics` file download for Apple/Outlook. The `.ics` must handle the `Australia/Brisbane` time zone correctly (include a VTIMEZONE or use UTC times).
3. **Dress code and vibes:** link to the Pinterest board (placeholder for now). Include an "Invitation to follow" note.
4. **RSVP**, headed "Can you make it?": a form that writes to a Google Sheet. One person can RSVP for their whole party. Show a friendly success state and handle errors. RSVP deadline: 1 December 2026.
   - Fields: name, email (optional), attending (yes/no), party size, dietary requirements, message.
   - **Not yet confirmed:** these are the defaults I suggested, so revisit them before building.

## RSVP backend
- Use a Google Apps Script deployed as a web app that receives the POST and appends a row to a Google Sheet.
- Write the Apps Script and give step-by-step deployment instructions, including the CORS/redirect quirks of Apps Script web apps.
- Keep the endpoint URL in one config value. Add basic spam protection (a hidden honeypot field).
- Don't collect more personal data than the form fields above.

## Technical decisions
- **Stack:** plain HTML/CSS/JS with **Vite**; GSAP and three.js from npm (bundle ≈ 170 kB gzipped).
- **Hosting:** **GitHub Pages**, deployed by a GitHub Actions workflow on push to `main`. Set the `base` path in `vite.config.js` so it's easy to move to my own repo or domain later. (Netlify and Vercel are also acceptable.)
- Mobile-first, single page, works well on small phones and scales up to desktop.
- Fast load: optimise and preload assets, and show a lightweight loading state.
- Accessible: sensible alt text, focus states, and tap targets of at least 44px. The planet must be keyboard-focusable.
- I'm quite comfortable with code, so comment non-obvious parts and don't over-explain the basics.

## File structure
```
Wedding_Save_the_date/
├── index.html              # markup for every scene + info panel
├── src/
│   ├── config.js           # ALL tweakables: event details, timings, fps, easings, colours, audio cues
│   ├── main.js             # boot: preload, title screen, audio unlock
│   ├── timeline.js         # the GSAP master timeline (scenes as labelled sub-timelines)
│   ├── fx/
│   │   ├── stepped.js      # "on twos" helper: per-element fps for tweens
│   │   ├── boil.js         # cycles 2–3 PNG drawings per element
│   │   ├── stars.js        # parallax layers, drift, twinkle
│   │   └── shake.js        # decaying planet shake, repeats until tapped
│   ├── audio.js            # mute toggle + timeline-label cue hooks
│   ├── debug.js            # ?debug scrubber + scene-jump buttons
│   └── styles.css
├── public/assets/          # placeholder PNGs now → real art later (same filenames)
│   ├── rocket/  planet/  earth/  stars/  background/
│   └── audio/
├── vite.config.js          # base path for GitHub Pages
└── .github/workflows/deploy.yml
```

## Open items
- Real **Mii drawings** for Vik and Zoe (placeholders are generic).
- Ceremony/event **start time** (3:00pm placeholder).
- Final **end time** (11pm or midnight).
- **Pinterest board** URL.
- Confirm **RSVP fields** and "Can you make it?" wording.
- Real **art** and **audio** files.
