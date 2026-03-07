import aiosqlite
import os
import bcrypt

DATABASE_PATH = os.getenv("DATABASE_PATH", "/data/app.db")

# Fallback to local path for development only if /data doesn't exist at all
if not os.path.exists("/data") and DATABASE_PATH == "/data/app.db":
    DATABASE_PATH = os.path.join(os.path.dirname(__file__), "..", "app.db")

async def get_db():
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    try:
        yield db
    finally:
        await db.close()

async def init_db():
    db = await aiosqlite.connect(DATABASE_PATH)
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL DEFAULT '',
            avatar_url TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            credential_type TEXT NOT NULL,
            credential_data TEXT NOT NULL DEFAULT '{}',
            is_valid INTEGER DEFAULT 0,
            validated_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, credential_type),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            bundle_id TEXT DEFAULT '',
            github_repo TEXT DEFAULT '',
            platform TEXT DEFAULT 'both',
            status TEXT DEFAULT 'setup',
            icon_url TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS questionnaire_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            question_key TEXT NOT NULL,
            answer_text TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id, question_key),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS store_listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            platform TEXT NOT NULL DEFAULT 'ios',
            locale TEXT DEFAULT 'en-US',
            title TEXT DEFAULT '',
            subtitle TEXT DEFAULT '',
            description TEXT DEFAULT '',
            keywords TEXT DEFAULT '',
            whats_new TEXT DEFAULT '',
            promotional_text TEXT DEFAULT '',
            category TEXT DEFAULT '',
            secondary_category TEXT DEFAULT '',
            pricing_model TEXT DEFAULT 'free',
            price TEXT DEFAULT '0',
            privacy_url TEXT DEFAULT '',
            support_url TEXT DEFAULT '',
            marketing_url TEXT DEFAULT '',
            aso_score INTEGER DEFAULT 0,
            aso_tips TEXT DEFAULT '[]',
            viral_hooks TEXT DEFAULT '[]',
            growth_strategies TEXT DEFAULT '[]',
            competitor_analysis TEXT DEFAULT '',
            generated_by_ai INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id, platform, locale),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS pipeline_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS pipeline_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER NOT NULL,
            step_name TEXT NOT NULL,
            step_order INTEGER DEFAULT 0,
            platform TEXT DEFAULT 'both',
            status TEXT DEFAULT 'pending',
            log_output TEXT DEFAULT '',
            error_message TEXT DEFAULT '',
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES pipeline_runs(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ai_generation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            generation_type TEXT NOT NULL,
            prompt_summary TEXT DEFAULT '',
            result_summary TEXT DEFAULT '',
            tokens_used INTEGER DEFAULT 0,
            model_used TEXT DEFAULT 'gpt-4o-mini',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS project_strategy (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            strategy_data TEXT DEFAULT '{}',
            monetization_data TEXT DEFAULT '{}',
            metrics_data TEXT DEFAULT '{}',
            mistakes_data TEXT DEFAULT '[]',
            screenshot_tips TEXT DEFAULT '[]',
            onboarding_tips TEXT DEFAULT '[]',
            tokens_used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS campaign_content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            content_type TEXT NOT NULL,
            content_data TEXT DEFAULT '{}',
            tokens_used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id, content_type),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            key TEXT NOT NULL,
            value TEXT DEFAULT '',
            UNIQUE(user_id, key),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS setup_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            credential_type TEXT NOT NULL,
            message TEXT DEFAULT '',
            screenshot_base64 TEXT DEFAULT '',
            status TEXT DEFAULT 'new',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        -- HELIXA Tables
        CREATE TABLE IF NOT EXISTS helixa_ideas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            raw_input TEXT NOT NULL,
            idea_name TEXT NOT NULL,
            product_type TEXT NOT NULL,
            overall_score REAL NOT NULL DEFAULT 0,
            structured_idea TEXT NOT NULL DEFAULT '{}',
            scores TEXT NOT NULL DEFAULT '{}',
            valuation TEXT NOT NULL DEFAULT '{}',
            build_brief TEXT NOT NULL DEFAULT '{}',
            autonomy TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS helixa_synthesized_ideas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            source_idea_ids TEXT NOT NULL DEFAULT '[]',
            source_idea_names TEXT NOT NULL DEFAULT '[]',
            concept TEXT NOT NULL DEFAULT '{}',
            status TEXT NOT NULL DEFAULT 'pending',
            user_comment TEXT NOT NULL DEFAULT '',
            ai_revision TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS helixa_experimental_ideas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            idea_name TEXT NOT NULL,
            product_type TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            overall_score REAL NOT NULL DEFAULT 0,
            structured_idea TEXT NOT NULL DEFAULT '{}',
            scores TEXT NOT NULL DEFAULT '{}',
            generation_number INTEGER NOT NULL DEFAULT 1,
            learning_note TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pending',
            user_comment TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            project_id INTEGER,
            type TEXT NOT NULL DEFAULT 'info',
            title TEXT NOT NULL DEFAULT '',
            message TEXT NOT NULL DEFAULT '',
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS planter_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            idea_id INTEGER,
            idea_name TEXT NOT NULL DEFAULT '',
            devin_session_id TEXT NOT NULL DEFAULT '',
            session_url TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'running',
            title TEXT NOT NULL DEFAULT '',
            pr_url TEXT NOT NULL DEFAULT '',
            frontend_url TEXT NOT NULL DEFAULT '',
            backend_url TEXT NOT NULL DEFAULT '',
            repo_url TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)

    # Add block_type and retry_count columns to pipeline_steps (safe for existing DBs)
    for col_sql in [
        "ALTER TABLE pipeline_steps ADD COLUMN block_type TEXT DEFAULT ''",
        "ALTER TABLE pipeline_steps ADD COLUMN retry_count INTEGER DEFAULT 0",
    ]:
        try:
            await db.execute(col_sql)
        except Exception:
            pass  # Column already exists

    # Seed default user if not exists (ensures user survives deploys without persistent volume)
    cursor = await db.execute("SELECT id FROM users WHERE email = ?", ("marcel.kamon@gmail.com",))
    if not await cursor.fetchone():
        pw_hash = bcrypt.hashpw("Admin123!".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        await db.execute(
            "INSERT INTO users (email, password_hash, full_name, created_at) VALUES (?, ?, ?, datetime('now'))",
            ("marcel.kamon@gmail.com", pw_hash, "Marcel Kamon")
        )

    await db.commit()
    await db.close()
