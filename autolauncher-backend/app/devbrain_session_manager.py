"""DevBrain Session Manager — creates, monitors, and comments on Devin sessions via API.
Implements the session lifecycle: create -> monitor -> comment/correct -> ensure completion."""
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

DEVIN_API_BASE = "https://api.devin.ai/v1"


class DevinAPIClient:
    """Client for interacting with the Devin API."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {"Authorization": f"Bearer {api_key}"}

    async def create_session(self, prompt: str) -> Optional[dict]:
        """Create a new Devin session with the given prompt."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{DEVIN_API_BASE}/sessions",
                    headers=self.headers,
                    json={"prompt": prompt},
                )
                if resp.status_code in (200, 201):
                    return resp.json()
                logger.error(f"Create session failed: {resp.status_code} {resp.text}")
                return None
        except Exception as e:
            logger.error(f"Create session error: {e}")
            return None

    async def get_session(self, session_id: str) -> Optional[dict]:
        """Get session details including messages."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(
                    f"{DEVIN_API_BASE}/sessions/{session_id}",
                    headers=self.headers,
                )
                if resp.status_code == 200:
                    return resp.json()
                logger.error(f"Get session failed: {resp.status_code}")
                return None
        except Exception as e:
            logger.error(f"Get session error: {e}")
            return None

    async def list_sessions(self, limit: int = 100, offset: int = 0) -> list:
        """List all sessions."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(
                    f"{DEVIN_API_BASE}/sessions",
                    headers=self.headers,
                    params={"limit": limit, "offset": offset},
                )
                if resp.status_code == 200:
                    return resp.json().get("sessions", [])
                return []
        except Exception as e:
            logger.error(f"List sessions error: {e}")
            return []

    async def send_message(self, session_id: str, message: str) -> bool:
        """Send a message/comment to a running Devin session."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{DEVIN_API_BASE}/sessions/{session_id}/message",
                    headers=self.headers,
                    json={"message": message},
                )
                if resp.status_code in (200, 201):
                    logger.info(f"Message sent to {session_id}")
                    return True
                logger.error(f"Send message failed: {resp.status_code} {resp.text}")
                return False
        except Exception as e:
            logger.error(f"Send message error: {e}")
            return False


class DevBrainSessionManager:
    """Manages the lifecycle of Devin sessions on behalf of the user."""

    def __init__(self, devin_client: DevinAPIClient):
        self.devin_client = devin_client
        self._monitor_task: Optional[asyncio.Task] = None
        self._monitor_running = False
        self._last_check_at: Optional[str] = None

    async def create_session(self, enriched_prompt: str) -> Optional[dict]:
        """Create a new Devin session with an enriched prompt."""
        result = await self.devin_client.create_session(enriched_prompt)
        if result:
            logger.info(f"Created Devin session: {result.get('session_id', 'unknown')}")
        return result

    async def get_session_status(self, devin_session_id: str) -> Optional[dict]:
        """Get the current status and messages of a Devin session."""
        return await self.devin_client.get_session(devin_session_id)

    async def send_comment(self, devin_session_id: str, comment: str) -> bool:
        """Send a comment to a running session."""
        return await self.devin_client.send_message(devin_session_id, comment)

    async def check_session_health(self, devin_session_id: str) -> dict:
        """Check if a session is healthy (active, making progress)."""
        session_data = await self.devin_client.get_session(devin_session_id)
        if not session_data:
            return {"healthy": False, "reason": "Could not fetch session", "status": "unknown"}

        status = session_data.get("status_enum", session_data.get("status", "unknown"))
        messages = session_data.get("messages", [])

        if status in ("finished", "stopped"):
            return {
                "healthy": True,
                "reason": f"Session {status}",
                "status": status,
                "messages": messages,
            }

        if status == "running":
            # Check if there's recent activity
            if messages:
                last_msg = messages[-1]
                last_time = last_msg.get("created_at", "")
                return {
                    "healthy": True,
                    "reason": "Session is running",
                    "status": status,
                    "last_activity": last_time,
                    "messages": messages,
                }

        return {
            "healthy": status == "running",
            "reason": f"Session status: {status}",
            "status": status,
            "messages": messages,
        }

    def start_monitor(self, db_path: str, check_interval: int = 300) -> None:
        """Start the background session monitor.

        Args:
            db_path: Path to the SQLite database
            check_interval: Seconds between checks (default 5 minutes)
        """
        if self._monitor_running:
            logger.info("Monitor already running")
            return

        self._monitor_running = True
        self._monitor_task = asyncio.create_task(
            self._monitor_loop(db_path, check_interval)
        )
        logger.info(f"DevBrain monitor started (interval: {check_interval}s)")

    def stop_monitor(self) -> None:
        """Stop the background monitor."""
        self._monitor_running = False
        if self._monitor_task:
            self._monitor_task.cancel()
            self._monitor_task = None
        logger.info("DevBrain monitor stopped")

    @property
    def is_monitoring(self) -> bool:
        return self._monitor_running

    @property
    def last_check_at(self) -> Optional[str]:
        return self._last_check_at

    async def _monitor_loop(self, db_path: str, check_interval: int) -> None:
        """Background loop that checks all active sessions."""
        import aiosqlite
        from app.devbrain_agent import DevBrainAgent
        from app.ai_engine import get_openai_client

        while self._monitor_running:
            try:
                self._last_check_at = datetime.now(timezone.utc).isoformat()
                logger.info("DevBrain monitor: checking active sessions...")

                async with aiosqlite.connect(db_path) as db:
                    db.row_factory = aiosqlite.Row

                    # Get all active sessions (status = running or created)
                    cursor = await db.execute(
                        "SELECT * FROM devbrain_sessions WHERE status IN ('running', 'created') AND auto_monitor = 1"
                    )
                    active_sessions = [dict(row) for row in await cursor.fetchall()]

                    if not active_sessions:
                        logger.info("DevBrain monitor: no active sessions to check")
                        await asyncio.sleep(check_interval)
                        continue

                    openai_client = await get_openai_client()

                    # Group sessions by user_id and load correct profile per user
                    sessions_by_user: dict[int, list[dict]] = {}
                    for session in active_sessions:
                        uid = session.get("user_id", 0)
                        sessions_by_user.setdefault(uid, []).append(session)

                    for user_id, user_sessions in sessions_by_user.items():
                        # Load profile for this specific user
                        profile_cursor = await db.execute(
                            "SELECT * FROM devbrain_profile WHERE user_id = ? ORDER BY id DESC LIMIT 1",
                            (user_id,),
                        )
                        profile_row = await profile_cursor.fetchone()
                        profile = dict(profile_row) if profile_row else {}

                        agent = DevBrainAgent(openai_client)
                        agent.set_profile(profile)

                        for session in user_sessions:
                            try:
                                await self._check_single_session(db, agent, session)
                            except Exception as e:
                                logger.error(f"Monitor error for session {session.get('devin_session_id')}: {e}")

                    await db.commit()

            except asyncio.CancelledError:
                logger.info("DevBrain monitor cancelled")
                break
            except Exception as e:
                logger.error(f"DevBrain monitor error: {e}")

            await asyncio.sleep(check_interval)

    async def _check_single_session(self, db, agent, session: dict) -> None:
        """Check a single session and take action if needed."""
        devin_session_id = session["devin_session_id"]
        health = await self.check_session_health(devin_session_id)
        now = datetime.now(timezone.utc).isoformat()

        # Update last checked
        await db.execute(
            "UPDATE devbrain_sessions SET last_checked_at = ? WHERE id = ?",
            (now, session["id"]),
        )

        status = health.get("status", "unknown")
        messages = health.get("messages", [])

        # If session finished, update status
        if status in ("finished", "stopped"):
            await db.execute(
                "UPDATE devbrain_sessions SET status = ?, updated_at = ? WHERE id = ?",
                (status, now, session["id"]),
            )
            await db.execute(
                "INSERT INTO devbrain_actions (session_id, action_type, content, devin_response, created_at) VALUES (?, ?, ?, ?, ?)",
                (session["id"], "status_update", f"Session {status}", "", now),
            )
            logger.info(f"Session {devin_session_id} marked as {status}")
            return

        # If running, have the agent review it
        if status == "running" and messages:
            review = await agent.review_session_output(
                session_title=session.get("app_name", "Unknown"),
                session_messages=messages,
                app_name=session.get("app_name"),
            )

            review_result = review.get("review_result", "on_track")

            if review.get("needs_comment") and review.get("comment"):
                comment = review["comment"]
                sent = await self.send_comment(devin_session_id, comment)
                action_type = "correction" if review_result == "needs_correction" else "nudge"
                await db.execute(
                    "INSERT INTO devbrain_actions (session_id, action_type, content, devin_response, created_at) VALUES (?, ?, ?, ?, ?)",
                    (session["id"], action_type, comment, "sent" if sent else "failed", now),
                )
                logger.info(f"Agent sent {action_type} to {devin_session_id}: {comment[:100]}")

            elif review_result == "stalled":
                nudge = await agent.generate_nudge(
                    session_title=session.get("app_name", "Unknown"),
                    last_activity=health.get("last_activity", "unknown"),
                )
                sent = await self.send_comment(devin_session_id, nudge)
                await db.execute(
                    "INSERT INTO devbrain_actions (session_id, action_type, content, devin_response, created_at) VALUES (?, ?, ?, ?, ?)",
                    (session["id"], "nudge", nudge, "sent" if sent else "failed", now),
                )
                logger.info(f"Agent nudged stalled session {devin_session_id}")

            elif review_result == "completed":
                await db.execute(
                    "UPDATE devbrain_sessions SET status = 'completed', updated_at = ? WHERE id = ?",
                    (now, session["id"]),
                )
                await db.execute(
                    "INSERT INTO devbrain_actions (session_id, action_type, content, devin_response, created_at) VALUES (?, ?, ?, ?, ?)",
                    (session["id"], "completion_check", "Session completed successfully", "", now),
                )
                logger.info(f"Session {devin_session_id} marked as completed by agent")
