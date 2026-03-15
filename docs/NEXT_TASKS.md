# AutoLauncher / HELIXA Next Tasks

Date: 2026-03-15
Source: extracted from the current OpenClaw backlog and local repo truth

## Highest priority

1. Verify backend parity between `devin/initial-push`, `codex/pr1`, and
   `codex/pr2`, especially around:
   - `app/main.py`
   - `app/database.py`
   - `app/devbrain_agent.py`
   - `app/devbrain_session_manager.py`
   - `app/task_queue.py`
   - `app/watchdog.py`

2. Verify frontend parity between the currently working screens:
   - `Dashboard.tsx`
   - `Planter.tsx`
   - `HelixaModule.tsx`
   - `ProjectFlow.tsx`
   - `SetupWizard.tsx`
   - `src/lib/api.ts`

3. Replace remaining legacy builder branding and flow assumptions with
   AutoLauncher-owned execution UX.

4. Harden the HELIXA -> Planter -> build execution chain so it produces a
   tangible output path every time.

## Production hardening

5. Audit DevBrain session message, review, and monitoring flows end-to-end.
6. Confirm queue/watchdog behavior matches the intended operator experience.
7. Add smoke tests for:
   - auth
   - HELIXA idea capture
   - Planter build creation
   - project creation from HELIXA idea
   - session follow-up and comment flow

## UX polish

8. Raise the Planter right-hand pane from legacy external-session framing to a
   first-class AutoLauncher build console.
9. Clean HELIXA terminology so it reads as a product capability, not an orphaned
   AI experiment.
10. Audit onboarding flow and setup wizard language for production readiness.
