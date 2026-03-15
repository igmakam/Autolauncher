# AutoLauncher / HELIXA Product Context

Date: 2026-03-15
Owner: Codex / OpenClaw

This file pulls the essential AutoLauncher and HELIXA context into the
standalone project so future work does not depend on hunting through OpenClaw
docs.

## Proven truth

- AutoLauncher is an existing product, not a greenfield concept.
- HELIXA lives inside AutoLauncher and is an execution-relevant subsystem.
- Proven branches:
  - `devin/initial-push`
  - `codex/pr1`
  - `codex/pr2`
- Live backend:
  - `https://autolauncher-backend-production.up.railway.app`

## Verified product surfaces

- Dashboard
- Planter
- Setup Wizard
- HELIXA endpoints and UI
- queue/watchdog endpoints
- DevBrain session work

## Practical meaning

- We should preserve and harden the current flows instead of replacing them.
- HELIXA should stay connected to Planter and project creation flows.
- Branch parity matters more than cosmetic rewrites.
- Tangible output wins over speculative redesign.

## Working prompts extracted from the portfolio docs

- AutoLauncher is an app factory, not just a dashboard.
- HELIXA is an idea-to-build intelligence layer, not a decorative tab.
- Replace external-agent-first behavior with AutoLauncher/OpenClaw-controlled
  execution where possible.
- Preserve DevBrain insights while moving operational control inward.
- Always end with an artifact: running flow, URL, commit, or verified fix.

## Open questions that still need implementation, not theory

- Backend parity between `devin/initial-push`, `codex/pr1`, and `codex/pr2`
- Frontend parity across Dashboard, Planter, HELIXA, ProjectFlow, and Setup Wizard
- Flow hardening between HELIXA build brief output and Planter execution
- Replacement of legacy Devin-only branding with AutoLauncher-owned execution UX
