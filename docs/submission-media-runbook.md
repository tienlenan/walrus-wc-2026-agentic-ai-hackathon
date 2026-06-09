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
Final poster theme:
- Header: `THE DAILY WALRUS`
- Subline: `World Cup Predictions, Memory, Roasts`
- Body blocks:
  1) Prediction engine
  2) Memory before/after
  3) Walrus + Sui proof links
  4) Roast card preview
- Recommended size: `1080x1350` and optional `1200x630`.
- Export as PNG + PDF for form upload.

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
   - `screenshots/screenshot-before-after.png`

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

