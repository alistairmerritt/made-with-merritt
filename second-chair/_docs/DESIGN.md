# Second Chair website: the design

Rebuilt 12 November 2026. The previous site (a red hero, then six dark sections of cards) is in `~/Developer/second-chair-website-v1-backup.zip`.

## The idea

**One listening session.** The home page is a single record playing, from top to bottom. The Mac leads; the iPhone follows a beat behind (180 ms), at a larger scale. Every picture on the page is a piece of the real product, and they all share one state: press Pause on the Lock Screen in section 2 and the Mac menu in the hero pauses too.

Three territories were tried before this one:

| | Idea | Why not |
| --- | --- | --- |
| **One listening session** | The page is one record; the Mac leads, the iPhone follows; the room takes the song's colour | Chosen: it shows the product, and the timing explains the sync |
| Liner notes | The site as a record sleeve: credits type, a track list for navigation, the guide as liner notes | Music clichés; a print look fights the native iOS interface |
| Glass companion | The icon's two shapes as the whole visual language, screens seen through refracting glass | Abstract before it's useful; heavy on glass and WebGL |

## The system

**Colour comes from the song.** The hero stage is the colour of the record the iPhone is showing, the way iOS tints Now Playing. It starts on red (the icon's own), and when the first record ends after about half a minute, or someone presses Next, the room changes. Light records switch the ink to near-black. Between the moments the ground is paper (`#f3eee6`), then night (`#110e0c`), then paper.

**Type.** Display type is IvyPresto Headline Light (300), roman and italic, served by Adobe Fonts. It replaced Newsreader in November 2026 after two side-by-side studies of the first screen (21 faces, then 22 in the late-90s Adobe Garamond vein); Light rather than Regular, which felt heavy. Tracking is −1% (italic −0.5%): IvyPresto is spaced tight already, and −2% made pairs touch at section-heading sizes. The web project has only Light, so the guide's small serif labels use it too; add Headline Regular to the project if they ever need more weight. Newsreader Regular stays self-hosted as the fallback for when the kit can't load. Italic appears once: the hero's answer, "Music on your Mac. *Now Playing on your iPhone.*" Everywhere else is roman. Everything functional, and every device screen, is the system font (San Francisco on Apple devices), because that's what's on the devices.

**The Mac leads, the iPhone follows.** A change on the Mac shows on the Mac at once and on the iPhone 180 ms later. A press on the iPhone reaches the Mac after 130 ms (its menu rings briefly), and the iPhone shows the result once the Mac's state comes back. It's the same order as the real apps, slowed just enough to see.

**Scale.** On the Mac, Second Chair is a menu-bar note and a 320-point menu. On the iPhone it's the whole screen. The pictures keep that ratio: the Mac menu at true size, the iPhone large and cropped.

**The header is a menu bar.** On a Mac-sized screen the site's header reads as one, and Second Chair's menu hangs from the music note in its corner, as it does in macOS.

**Seats.** In Continue Listening the device names are set big enough to sit on. The song's artwork sits on the name of the device playing it; the other name dims, and artwork that isn't playing greys. The controls sit under the names, each in its own device's interface, never on the artwork: the iPhone app's row (Continue on iPhone, or Continue on Mac once the song is there) and, once the song is on the iPhone, the Mac menu's Continue from iPhone, which plays out the menu's real status lines.

**StandBy's artwork turns.** When the song changes, the StandBy artwork turns on its vertical axis, as Music does in StandBy: the old cover goes edge-on, the new one comes round from the other side. Next and Previous turn opposite ways. Everywhere else the artwork changes with a quick dip.

## The four moments

1. **The proposition.** A small all-caps label just under the nav says what it is ("A companion app for Apple Music, on Mac and iPhone"), then the headline, one sentence, the Mac menu and the iPhone in StandBy, playing. About two seconds after landing, the Mac's artwork lifts out of the menu and lands as the StandBy artwork (only when the hero is on screen; a press during the wait skips it). StandBy is laid out from a real StandBy screenshot: artwork left at 76% of the screen's height; title, tinted artist, controls, then scrubber and times centred on the right; the background is the artwork's colour, deepened. The phone sits with equal margins to its right and below. The buttons on both work.


**The sound, in the room.** While Music plays on the Mac, a quiet row of sound bars moves along the bottom of the stage in time with the song (each record has a tempo): the low end pulses on the beat, the rest swells and shimmers in slow rolling shapes. Pause, or Continue on iPhone, and the bars settle to a flat line. With Reduce Motion it's a still row while playing. One canvas, drawn only while the stage is on screen. (Also tried and set aside: rings from the Mac, taller jagged spectrum bars, a smooth line, and a scrolling single-line waveform.)

**Try it with your own song.** In the bottom-left corner of the first screen (on smaller screens, under the copy), a search of Apple Music's catalogue. Pick a song and it becomes the demo's song on every device, in its cover's colours, with its 30-second preview playing; the demo's own buttons play and pause it. It says plainly that it's only a demo on this page.

Every clock on the site (Lock Screen, Watch, status bars, the guide's menu bar) shows the visitor's own time and date.
2. **The controls.** "*Press it here.* It happens there." A large Lock Screen, cropped by the section edge, with a working scrubber and volume; an Apple Watch Ultra beside it at true scale (its 44 mm case is 62% of an iPhone's width), showing watchOS Now Playing with its progress ring; the Mac menu answering.
3. **Continue Listening, both ways.** "Take your music with you. Then bring it back." One grid runs through the section, on the page's edges: the heading across the top, "leaving" over the Mac's column and "coming back" over the iPhone's, the seats below, and the small print at the foot. The seats, with each device's own control under its name.
4. **Get it.** Two apps, the four setup steps (the fourth marked, because it's the one people miss), and the limits in one line.

Removed from the old home page: How it works (the wire diagram), the feature cards, the step strip that repeated the guide, What it doesn't do (now one line), and the orchestra explanation. The name is left to explain itself.

## The guide

A different job, so a quieter page: paper, or dark when the system is dark. The four steps are a map at the top, each linking to its section; every instruction is labelled with the device you're holding (Mac in roman, *iPhone* in italic); step 4 sits in a red panel. Illustrations of the real screens sit beside the steps that need them. Reference material (troubleshooting, privacy, unpairing, limits) follows, and stays scannable.

## Breakpoints

- **Wide screens** (≥ 960 px and wider than 5:4): the composition above.
- **Tablets and tall windows:** copy first, the Mac menu still hanging top right, StandBy beneath.
- **Phones upright:** the Mac menu, then StandBy across the width; the Lock Screen comes in section 2.
- **Phones sideways:** copy and StandBy side by side, as the phone itself would show it on a charger.
