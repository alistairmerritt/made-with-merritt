# Second Chair website

Lives at https://madewithmerritt.com/second-chair/, as the `second-chair/` folder of the `made-with-merritt` repository (GitHub Pages). This folder is the only copy: edit it here. It moved from `music-standby/website/` on 15 November 2026.

Three static pages, three stylesheets, four small scripts. No build step, no dependencies.

```
second-chair/
  index.html                 Home: four moments (see DESIGN.md)
  getting-started/index.html The setup guide
  privacy/index.html         The app's privacy policy: the address for TestFlight and the App Store
  assets/css/base.css        Tokens, type, header, footer, buttons and every device picture
  assets/css/home.css        The home page
  assets/css/guide.css       The guide (light and dark)
  assets/js/session.js       The shared listening session the device pictures follow
  assets/js/home.js          Home: the opening, Continue Listening, scrub and volume
  assets/js/guide.js         Guide: contents highlight, copy button
  assets/js/clock.js         Both: every clock shows the visitor's current time and date
  assets/art/                Six made-up record covers (AI-generated images, made for the site), each in two sizes
  assets/fonts/              Newsreader Regular, roman and italic: the fallback display face (SIL Open Font Licence, OFL.txt)
  assets/img/                App icon, favicon, social image (og.png)
  _docs/                     This README, DESIGN.md and serve.py. GitHub Pages runs Jekyll, which never publishes a folder starting with _
```

## Preview it

From the repository root:

```bash
python3 second-chair/_docs/serve.py
```

Then open http://localhost:4174/second-chair/. It serves the whole repository, the way GitHub Pages does, so the links back to Made with Merritt work too. Use this rather than `python3 -m http.server`: the stock server only queues five connections, so the artwork sometimes comes back as a broken image. Opening `index.html` from Finder also works, apart from the fonts in Firefox.

## Before publishing

Feedback: TestFlight's own (Share Beta Feedback) or the contact form. What the relay keeps: on unpair it deletes the pairing's storage at once (`deleteAll()` in `Relay/src/pairing.ts`); Cloudflare keeps a 30-day recovery history the relay never uses. The privacy page says so; keep it true if that changes.

Search the pages for `TODO` and `todo` (none left on 15 November 2026). The yellow notes show on the page on purpose, so nothing unconfirmed ships by accident.

| Where | What's needed |
| --- | --- |
| Home, Get it, iPhone column; guide, step 2a | Invitations go through the Made with Merritt contact form (`/?contact=1`). With a public TestFlight link, link that instead |
| Guide | The four illustrations, once screenshots exist (below) |
| Home, Try it with your own song | Check Apple's terms for showing catalogue results, artwork and previews on a website (the Apple Music identity guidelines and the iTunes Search API's terms). Each picked song links to Apple Music as attribution |

## Fonts

The display face, IvyPresto Headline Light (roman and italic), is served by Adobe Fonts from the web project `fiv2yhs` in Alistair's Adobe account; both pages link `https://use.typekit.net/fiv2yhs.css`, which defines the family `ivypresto-headline`. Adobe Fonts doesn't allow its font files to be hosted here, so there are none in `assets/fonts/`.

- It keeps serving only while the Creative Cloud subscription is active. If the project is deleted or lapses, or a blocker stops it, every heading falls back to Newsreader, which is self-hosted and needs nothing.
- The kit's stylesheet also loads `p.typekit.net/p.css`, which Adobe uses to count page views for font licensing. The guide's privacy section says so; keep that sentence while the kit is in use.
- To change weights, edit the web project on fonts.adobe.com (the kit URL stays the same), then the `font-weight` values in the CSS.
- `assets/img/og.png` is a picture of the headline, rendered with the copy activated on this Mac, so it doesn't depend on the kit.

## Product claims to keep true

The copy was checked against the apps on 16 November 2026 (Mac 0.3.1; iPhone TestFlight 202611160929):

- **Play To is gone.** It was removed from the iPhone app on 12 November, so neither page mentions choosing speakers. If it comes back, it goes in the guide under "You're ready", not on the home page.
- **The volume slider sets Music's own volume on the Mac**, not the Mac's system volume. The copy says "turn Music up or down on the Mac".
- **Continue Listening** runs both ways. The iPhone app has Continue on iPhone and Continue on Mac; the Mac's menu has Continue from iPhone, shown whenever Music on the Mac is paused or stopped (hidden while it plays, or isn't open). After Continue on iPhone, until Music plays there again, the menu's song and controls dim, its "On This Mac" heading says "Continued on iPhone", and Continue from iPhone is the blue, prominent button. Its status lines ("Asking your iPhone…", "Your iPhone is handing over…", "Answer the notification on your iPhone or Apple Watch.") are quoted from `MacCompanion`; the notification's button is **Continue on Mac**.
- **Continue on Mac works for any song.** A song the Mac's queue doesn't have plays as that song's station: from the same point when the station starts with it, otherwise from the station's first song ("Your Mac is playing this song's station, which started with another song."). "This song is no longer in your Mac's queue" no longer exists; don't bring it back.
- **The iPhone app says whether Continue Listening can work.** Its Continue Listening section starts with Status: Ready, Set Up on Your Mac, Reconnect on Your Mac, Allow Apple Music or Needs Apple Music. The guide's "If it isn't ready" list quotes each note.
- **Mac menu labels:** "Connected" with no address (never show the relay's address); "iPhone · Paired", not the phone's name; the Music section is headed "Continue Listening", with Connect to Music…, Disconnect from Music, and "Music no longer recognises Second Chair…" when Music has forgotten it. The iPhone app's Mac section has Reconnect to Mac and Unpair Mac.
- **Don't promise** that Continue on Mac's station starts with the song: in tries, about half began with another.
- **Continue on iPhone** adds a station made from the song when the Mac has fewer than three songs to come, and run again with nothing new on the Mac it carries on with the phone's own music.
- **Privacy:** the iPhone asks Apple Music for the song's station. For Continue on Mac with a song the Mac's queue doesn't have, its Apple Music ID, title and the phone's position go to the Mac through the relay. Only whether Second Chair is connected to Music goes to the iPhone. Both privacy lists say so.
- **App icon:** the apps' Icon Composer file (`AppIcon.icon`, the same in both apps) renders as a blue tile with two glass play shapes, which is what `assets/img` has. Re-export with Xcode's `ictool` if it changes.
- **Shortcuts:** every control is an action in the Shortcuts app (verified on the device). Siri phrases and the Action button weren't tried, so the guide doesn't promise them.

## Screenshots

There are no real screenshots of Second Chair in StandBy or on a Lock Screen yet, so every device on the site is drawn in HTML from the apps' own layouts and labels (`MenuContent.swift`, `HomeView.swift`, `PairingView.swift`). The home page's are interactive (their labels for screen readers say they're illustrations). The guide's four are marked "Illustration".

To capture, on an iPhone 15 Pro or later on iOS 27, playing one of your **own** records or a cleared one (not commercial album art):

1. **StandBy, Now Playing**, landscape on a charger: the home page's hero is built around this.
2. **Lock Screen** with the player: home, section 2.
3. **Second Chair's menu** on the Mac, unpaired, with `Pair iPhone…` showing: guide, step 1.
4. **The six-digit code** on the Mac and **Pair with Mac** on the iPhone: guide, step 3.
5. **The iPhone app's home**, with `Show in Now Playing` showing: guide, step 4.
6. Optional: **Apple Watch** Now Playing; **Continue on iPhone** mid-handover.

In the guide, each illustration is a `<figure class="fig">` with a comment above it. Swap the `.fig-stage` div for an image and keep the caption:

```html
<figure class="fig">
  <img src="../assets/img/menu.png" alt="Second Chair's menu on the Mac, with Pair iPhone…" width="640" height="900" loading="lazy">
  <figcaption><b>The music note's menu.</b> Everything Second Chair does on the Mac is in here.</figcaption>
</figure>
```

On the home page, keep the drawn devices: they're the demonstration. A real StandBy photograph would suit the social image (`assets/img/og.png`, 1200×630) best.

## The records

The six records are made up: titles, artists and covers. The covers are AI-generated images made for the site (16 November 2026; they replaced the original flat SVGs), each in `assets/art/` twice: `<id>.webp` at 720 px for the two big places (StandBy and Continue Listening, up to 357 CSS px wide) and `<id>-sm.webp` at 144 px for every small one (menus, Lock Screen, Watch, Up Next), so the first screen loads one big cover rather than six. `BIG_ART` in `session.js` says which places are big. To make them from a new square master:

```bash
cwebp -q 82 -m 6 -sharp_yuv -resize 720 720 cover.png -o assets/art/<id>.webp
cwebp -q 80 -m 6 -sharp_yuv -resize 144 144 cover.png -o assets/art/<id>-sm.webp
```

To add or change a record, edit `RECORDS` at the top of `assets/js/session.js`: `stage` is the colour the hero takes while it plays, `ink` is white or near-black to suit it (check 4.5:1 for small text), and `wall` is the two colours behind StandBy and the Lock Screen. The file name in `art/` is the `id`. The colours are chosen by eye, not read from the covers: the site's own reading (the one "Try it with your own song" uses) gave muddy browns for these. If Low Sun's cover changes, re-render `og.png` and the Made with Merritt card and slides (`_docs/card.html`, `_docs/slide.html`), which all show it.

## When a new version ships

Search for the old version number. It appears in:

- `index.html`: Get it (Mac column, text and both GitHub links) and the footer
- `getting-started/index.html`: the eyebrow, What you need, step 1a (file name and link) and the footer
- The TestFlight build number: Get it (iPhone column), What you need and step 2a

On-screen labels are wrapped in `class="ui"` (or `kbd class="ui"` for things you press), and text the apps display in `class="says"`, which adds the quotation marks. If a label changes in the apps, searching for the old wording finds every use.

## Try it with your own song

The first screen's bottom-left control opens a search of Apple's public catalogue (`itunes.apple.com/search`: no key, no sign-in, nothing loaded until the visitor types). Picking a song makes it the demo's current record: every device shows its real artwork, title, artist and length, the stage takes the cover's colours (read from the artwork, which Apple serves with CORS), and its 30-second preview starts at once, inside the click so Safari allows it. Play and pause on any device drive the preview; when the clip ends, the demo pauses. The preview belongs to whichever device has the song: Continue on iPhone hands it to the iPhone without a break (the Mac pauses, the sound carries on), and Continue on Mac or Continue from iPhone hands it back, the Mac picking up exactly where the sound has got to (`sound` in `home.js`). While a preview plays the sound bars follow its real spectrum (Web Audio). The code is the `tryYourOwnSong` block in `assets/js/home.js`; the search window is the `<dialog>` at the end of `index.html`.

## Accessibility and motion

- With **Reduce Motion** on, nothing flies or fades, the demo starts paused, and every change is immediate.
- **Without JavaScript**, both pages are complete: the devices show a song, and the guide needs no script.
- The demo's controls are real buttons with labels ("Pause on the Mac", "Next, from the iPhone"). User-started changes are announced politely; songs ending by themselves aren't. The duplicate controls on the Watch and the second Mac menu are left out of the tab order, because the Lock Screen beside them does the same.
- In Continue Listening only the move that's open shows, in the seat the song would go to. After a move, keyboard focus goes to the button that moves it back.
- Clocks (`data-clock`, `assets/js/clock.js`) show the visitor's own time and date in their own 12- or 24-hour style; without JavaScript they read 18:24 on Thursday 12 November.
- Contrast: small text is at least 4.5:1 on every stage colour, on paper and on the dark section, including the two device labels in the first screen ("Mac, playing in Music", "iPhone, on the Lock Screen and in StandBy"). They were 50% opacity until 15 November (about 2.3:1 on the red) and are now full stage ink.

## Deploying

Committing to `main` in `made-with-merritt` publishes it: GitHub Pages serves the repository as is, and Jekyll copies the HTML untouched.

- **Adobe Fonts:** nothing to set up. Web projects no longer have a domain list, and the kit's files were checked on 15 November 2026 to load for a madewithmerritt.com page.
- **Addresses:** canonical links, `og:url` and `og:image` are absolute `https://madewithmerritt.com/second-chair/…` URLs. Change all three pages if the address ever changes.
- **Links out of the folder** are root-relative: `/` (Made with Merritt), `/privacy/` (the site's own policy) and `/?contact=1` (opens its contact form). Everything else is relative to the folder.
- **For TestFlight and the App Store:** privacy policy URL `https://madewithmerritt.com/second-chair/privacy/`; for a support URL, the guide's Need help section or the contact form.
