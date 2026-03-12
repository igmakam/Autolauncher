import aiosqlite
import os

DATABASE_PATH = os.getenv("DATABASE_PATH", "/data/app.db")

# Fallback to local path for development
if not os.path.exists(os.path.dirname(DATABASE_PATH)) and DATABASE_PATH.startswith("/data"):
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

        -- DevBrain Tables
        CREATE TABLE IF NOT EXISTS devbrain_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            preferred_tech_stack TEXT DEFAULT '[]',
            coding_conventions TEXT DEFAULT '[]',
            architectural_preferences TEXT DEFAULT '[]',
            communication_style TEXT DEFAULT '',
            frustrations TEXT DEFAULT '[]',
            what_works_well TEXT DEFAULT '[]',
            work_patterns TEXT DEFAULT '[]',
            key_principles TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS devbrain_apps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            status TEXT DEFAULT 'idea',
            tech_stack TEXT DEFAULT '[]',
            requirements TEXT DEFAULT '[]',
            related_sessions TEXT DEFAULT '[]',
            session_count INTEGER DEFAULT 0,
            priority TEXT DEFAULT 'low',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, name),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS devbrain_decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT DEFAULT '',
            session_id TEXT DEFAULT '',
            project TEXT DEFAULT '',
            decision TEXT DEFAULT '',
            context TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, date, session_id, project, decision),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS devbrain_corrections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT DEFAULT '',
            session_id TEXT DEFAULT '',
            project TEXT DEFAULT '',
            correction TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, date, session_id, project, correction),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS devbrain_sessions_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            devin_session_id TEXT NOT NULL,
            date TEXT DEFAULT '',
            title TEXT DEFAULT '',
            project TEXT DEFAULT '',
            goals TEXT DEFAULT '[]',
            decisions TEXT DEFAULT '[]',
            corrections TEXT DEFAULT '[]',
            preferences TEXT DEFAULT '[]',
            outcome TEXT DEFAULT '',
            outcome_detail TEXT DEFAULT '',
            tech_stack TEXT DEFAULT '[]',
            app_requirements TEXT DEFAULT '[]',
            patterns TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, devin_session_id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS devbrain_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            devin_session_id TEXT NOT NULL,
            app_name TEXT DEFAULT '',
            original_prompt TEXT DEFAULT '',
            enriched_prompt TEXT DEFAULT '',
            status TEXT DEFAULT 'created',
            auto_monitor INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_checked_at TIMESTAMP,
            UNIQUE(user_id, devin_session_id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS devbrain_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            action_type TEXT NOT NULL DEFAULT 'comment',
            content TEXT DEFAULT '',
            devin_response TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES devbrain_sessions(id) ON DELETE CASCADE
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

    await db.commit()
    await db.close()
