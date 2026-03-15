# AutoLauncher

Canonical standalone project for the `AutoLauncher` app factory and the `HELIXA`
idea-to-build subsystem.

This repository is the implementation home for:

- `autolauncher-backend`: operator backend, pipeline endpoints, queue/watchdog,
  DevBrain session orchestration, HELIXA APIs
- `autolauncher-frontend`: dashboard, Planter, Setup Wizard, HELIXA module,
  build supervision UI

## Why this project exists

AutoLauncher and HELIXA already have real code, live backend evidence, and
branch history. They should be hardened and improved here instead of being
re-invented elsewhere.

OpenClaw tracks AutoLauncher as a portfolio product, but the implementation
source of truth is this repository.

## Product truth

- Repo: `igmakam/Autolauncher`
- Local path: `/Users/marcelkamon/Documents/New project/Autolauncher`
- Live backend: `https://autolauncher-backend-production.up.railway.app`
- Important proven branches:
  - `devin/initial-push`
  - `codex/pr1`
  - `codex/pr2`

## Scope

- AutoLauncher dashboard and project pipeline
- HELIXA idea capture, scoring, valuation, build brief, export flows
- Planter build supervision flow
- DevBrain session tracking and execution handoff

## Structure

- [autolauncher-backend](/Users/marcelkamon/Documents/New project/Autolauncher/autolauncher-backend)
- [autolauncher-frontend](/Users/marcelkamon/Documents/New project/Autolauncher/autolauncher-frontend)
- [docs](/Users/marcelkamon/Documents/New project/Autolauncher/docs)

## Working rules

- Preserve real product flows before doing cosmetic rewrites.
- Treat HELIXA as a working subsystem, not a decorative tab.
- Ship tangible artifacts: build results, URLs, commits, or verified fixes.
- If something is not verified, label it `UNVERIFIED`.
