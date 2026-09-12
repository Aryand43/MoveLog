# MoveMate — animated walkthrough

`movemate-walkthrough.mp4` — 2:01, 1280×720, silent with burned-in captions.
`index.html` — the source. Open it in a browser and it plays the same 2:00 timeline in real time.

**What this is:** an animated walkthrough of the MoveMate concept. Every screen is an
illustration, not a recording of a running system. The title card says so on screen, and the
damage photo is labelled "illustration". Use it as a pitch/explainer piece, as B-roll around
real footage, or to rehearse the beats — **do not submit it as a demo of a working build.**
For the real recording, follow `docs/DEMO_VIDEO.md`.

**Timeline:** 0:00 title · 0:06 problem · 0:18 three surfaces · 0:26 voice logging ·
0:52 survey check and damage · 1:12 Telegram card and the round trip · 1:36 customer ·
1:49 close.

**No audio.** The voiceover lines are in `docs/DEMO_VIDEO.md` §2, timed to match. Record a VO
over the top, or leave it silent — the captions carry it.

**Editing it:** everything is driven by the `T` array at the bottom of `index.html` —
`[seconds, () => { ... }]`. Change a line of dialogue or a timing there and re-record with:

```bash
node record.mjs   # playwright-core, chrome channel, 121s → out/*.webm
ffmpeg -i out/page*.webm -c:v libx264 -crf 20 -pix_fmt yuv420p -r 30 movemate-walkthrough.mp4
```

Append `?t=90` to the URL to jump straight to a moment while iterating.
