# AutoLauncher / HELIXA Next Tasks

Date: 2026-03-15

1. Verify backend parity between `devin/initial-push`, `codex/pr1`, and
   `codex/pr2`, especially around `main.py`, `database.py`, DevBrain, queue, and
   watchdog surfaces.
2. Verify frontend parity between `Dashboard.tsx`, `Planter.tsx`,
   `HelixaModule.tsx`, `ProjectFlow.tsx`, `SetupWizard.tsx`, and `src/lib/api.ts`.
3. Replace remaining legacy builder branding and flow assumptions with
   AutoLauncher-owned execution UX.
4. Harden the HELIXA -> Planter -> build execution chain so it produces a
   tangible output path every time.

## Follow-on hardening

5. Audit DevBrain session message, review, and monitoring flows end-to-end.
6. Confirm queue/watchdog behavior matches the intended operator experience.
7. Add smoke tests for auth, HELIXA idea capture, Planter build creation,
   project creation from HELIXA idea, and session follow-up/comment flow.

## UX direction

8. Raise the Planter right-hand pane from legacy external-session framing to a
   first-class AutoLauncher build console.
9. Clean HELIXA terminology so it reads as a product capability, not an orphaned
   AI experiment.
10. Audit onboarding flow and setup wizard language for production readiness.

## Rule

AutoLauncher and HELIXA work continues only from this standalone project and no
longer through the shared OpenClaw fallback backlog.
