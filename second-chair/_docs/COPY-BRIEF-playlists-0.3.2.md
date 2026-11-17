# Copy brief: playlists carry over (Mac 0.3.2)

> **Applied on 17 November 2026,** together with the reminder changes (the reminder now comes after 8 minutes, and covers Apple Music taking the player's place). Also applied:
> - the round trip keeps the Mac's own queue;
> - a playlist needs Sync Library on both devices;
> - a shuffled playlist started on the iPhone in the last minute may still go as a station;
> - the playlist's Apple Music ID is sent only when it has one.
>
> Nothing here is left to do.


The version links and version numbers on both pages already point to 0.3.2. This brief covers only the wording.

## What changed

- **What carries over:** a playlist from your library now carries over in both directions, from the same song and point, and shuffled if you were shuffling.
- **What still goes as the song's station:**
  - albums
  - stations
  - Apple Music playlists you haven't added to your library
- **Whole playlist:** when your Mac plays a library playlist in order, Continue on iPhone gives the phone the whole playlist from that song, not just up to 25 songs of Up Next.
- **Continue on Mac:** a library playlist now continues on the Mac. The station is only for other songs.

Ignore `WEBSITE-BRIEF-continue-on-mac.md` in Downloads: it says playlists don't carry over, which is no longer true.

## Lines to change

Line numbers are from the current files.

### Guide (`second-chair/getting-started/index.html`)

- **309** (Continue Listening intro). It now says: "Your iPhone picks up the song in Apple Music from the same point, with your Up Next queue". It should mention that the playlist comes too.
- **345** (Continue on iPhone step). It now says: "with up to 25 songs from Up Next". When the Mac plays a library playlist in order, the phone gets the whole playlist from that song.
- **410** (Continue on Mac note). It now says your Mac plays the song's station if its queue doesn't have the song. A library playlist now continues instead; the station is for other songs.
- **479** (troubleshooting: "Your Mac is playing this song's station…"). Say when this still happens: with albums or Apple Music's own playlists, or when your Mac isn't connected to Music.
- **498, 500, 501** (what's sent where):
  - **498:** what the Mac sends now also includes the playlist's name, its size, the song's place in it and whether it's shuffled.
  - **500:** the iPhone also asks Apple Music for your recently played list, to tell which playlist is playing.
  - **501:** what goes through the relay for Continue on Mac now also includes the playlist details.

### Home (`second-chair/index.html`)

- **241** (the "When you're back" lede). It reads correctly now, but could mention the playlist.

### Privacy (`privacy/index.html`, #second-chair)

- **213:** "When you use Continue on Mac, the song's Apple Music ID, title and position go through the relay to your Mac." Add that playlist details go too: name, size, place in it, shuffle.
- **192–201** (what the relay holds): consider adding that playlist names are kept only as part of the latest playback state. Each update replaces the one before.
- **Continue Listening and Apple Music:** if the policy covers what the iPhone asks Apple Music for, add the recently played request.
