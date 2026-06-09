# Plan: Gil Settings + Roast Severity Rollout

Date: 2026-06-09  
Status: done

## What
- Added `roastSeverity` to AI settings (`light`, `standard`, `savage`) and persisted it in localStorage (`dw.ai-settings`).
- Added a dedicated Settings control inside the Newsroom header next to **🦭 Live from Judge Gil**.
- Wired `roastSeverity`, language resolution, and custom instructions through:
  - `POST /api/gil/chat`
  - `POST /api/roast`
- Applied severity in shared session context and roast prompt engine so both chat and roast respond with the selected tone.

## Why
- User wanted runtime control of Gil's tone and language without external config.
- Settings needs to be discoverable during chat flow, not hidden in footer utility area.

## How
- Frontend
  - Extended shared settings model (`AiSettings`) with `roastSeverity`.
  - Added UI controls in `apps/web/src/components/settings-panel.tsx` and added i18n strings in `apps/web/src/lib/i18n.tsx`.
  - Moved settings launcher into `NewsDeskChat` header (`apps/web/src/components/news-desk-chat.tsx` + `.css`).
  - Added request payload propagation in `apps/web/src/lib/gil-api.ts` and `apps/web/src/lib/world-cup-api.ts`.
- Backend
  - Added `roastSeverity` to chat and roast options in `apps/server/src/services/chat-with-gil.ts`.
  - Persisted severity into session context (`buildSessionContext` in `packages/shared/src/gil-persona.ts`), with normalized fallbacks in `RoastSeverity`.
  - Routed request parsing in `apps/server/src/serve.ts` and roast handling in `apps/server/src/services/roast-engine.ts`.

## When
- Validation done immediately after code changes:
  1. Run `./node_modules/.bin/tsc --noEmit -p packages/shared/tsconfig.json` ✅
  2. Run `./node_modules/.bin/tsc --noEmit -p apps/server/tsconfig.json` ✅
  3. Run `./node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json` ✅
- Pre-deploy verification:
  1. Open `#newsroom`, open Settings, switch severity across all three levels.
  2. Send one message in each app language (VI/EN), check reply tone and memory behavior.
  3. Trigger one roast request in each severity and confirm body includes `roastSeverity`.
  4. Reload the page and confirm settings are restored from localStorage.
