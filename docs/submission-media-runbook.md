# Media Runbook (Poster, Screenshots, Video)

## Logo (troll style, project theme)
Recommended outputs:
- `logo/icon.svg` (32/64/128)
- `logo/wordmark.svg`
- `logo/fav-icon.png`

Suggested style:
- Tabloid shape: stamp-border masthead + halftone accent.
- Keep mascot as a simplified Gil symbol, not a real photo.
- No official team crests, no real player faces.

## Poster
Final poster files:
- `apps/web/public/submission/poster-sketchnote.html`
- `apps/web/public/submission/poster-sketchnote.png`
- `apps/web/public/submission/poster-sketchnote.pdf`

Style:
- Hand-drawn sketchnote / highlighter poster.
- English copy only.
- Includes product goal, memory spine, roast layer, proof layer, and system structure.

## Screenshot Workflow
1. Deploy local environment:
   - `pnpm dev:server` and `pnpm dev:web`
2. Open pages and capture at native width ~1440:
   - `/`
   - `/#predictions`
   - `/#leaderboard`
   - `/#notebook`
   - `/#tracking`
   - `/#team-profiles`
3. Save with these exact names:
   - `screenshots/screenshot-home.png`
   - `screenshots/screenshot-predictions.png`
   - `screenshots/screenshot-leaderboard.png`
   - `screenshots/screenshot-notebook.png`
   - `screenshots/screenshot-tracking.png`
   - `screenshots/screenshot-team-profiles.png`
   - `screenshots/screenshot-gallery.png`
   - `screenshots/screenshot-roasts.png`

## Demo Video Script (≤ 3 minutes)
1. 0:00–0:20 connect wallet + UI intro.
2. 0:20–1:10 submit one prediction.
3. 1:10–1:45 trigger memory/roast / show notebook panel.
4. 1:45–2:25 show leaderboard and settlement result.
5. 2:25–3:00 show tracking page → open contract/object links.

## Export Notes
- Record in 1080p.
- Keep captions on for any speech.
- Add one closing frame: `Live: <walrus-domain> | Tracking: <tracking-page-url>`.
