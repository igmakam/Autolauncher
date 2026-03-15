# AutoLauncher Backend

FastAPI backend for the AutoLauncher product and HELIXA subsystem.

## Responsibilities

- authentication and operator sessions
- project pipeline orchestration
- credentials and store integrations
- HELIXA idea capture, scoring, valuation, and exports
- DevBrain session creation, monitoring, and feedback loops

## Important files

- [app/main.py](/Users/marcelkamon/Documents/New project/Autolauncher/autolauncher-backend/app/main.py)
- [app/database.py](/Users/marcelkamon/Documents/New project/Autolauncher/autolauncher-backend/app/database.py)
- [app/helixa_ai.py](/Users/marcelkamon/Documents/New project/Autolauncher/autolauncher-backend/app/helixa_ai.py)
- [app/devbrain_models.py](/Users/marcelkamon/Documents/New project/Autolauncher/autolauncher-backend/app/devbrain_models.py)

## Verification

Local syntax verification:

```bash
python3 -m compileall autolauncher-backend/app
```

Live health endpoint:

- [autolauncher-backend-production.up.railway.app/healthz](https://autolauncher-backend-production.up.railway.app/healthz)
