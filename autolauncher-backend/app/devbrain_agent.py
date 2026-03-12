"""DevBrain AI Agent — acts as user's proxy using extracted session metadata.
Builds enriched prompts, reviews session outputs, generates corrections."""
import json
import logging
from typing import Optional
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


class DevBrainAgent:
    """Core AI Agent that uses user metadata to act as the user's proxy."""

    def __init__(self, openai_client: AsyncOpenAI):
        self.client = openai_client
        self._profile_cache: Optional[dict] = None
        self._apps_cache: Optional[list] = None

    def set_profile(self, profile: dict) -> None:
        """Cache the user profile for prompt building."""
        self._profile_cache = profile

    def set_apps(self, apps: list) -> None:
        """Cache the apps catalog for context building."""
        self._apps_cache = apps

    def _build_system_prompt(self) -> str:
        """Build the system prompt that makes the agent act as the user."""
        profile = self._profile_cache or {}

        tech_stack = profile.get("preferred_tech_stack", "[]")
        if isinstance(tech_stack, str):
            try:
                tech_stack = json.loads(tech_stack)
            except (json.JSONDecodeError, TypeError):
                tech_stack = []

        conventions = profile.get("coding_conventions", "[]")
        if isinstance(conventions, str):
            try:
                conventions = json.loads(conventions)
            except (json.JSONDecodeError, TypeError):
                conventions = []

        arch_prefs = profile.get("architectural_preferences", "[]")
        if isinstance(arch_prefs, str):
            try:
                arch_prefs = json.loads(arch_prefs)
            except (json.JSONDecodeError, TypeError):
                arch_prefs = []

        frustrations = profile.get("frustrations", "[]")
        if isinstance(frustrations, str):
            try:
                frustrations = json.loads(frustrations)
            except (json.JSONDecodeError, TypeError):
                frustrations = []

        what_works = profile.get("what_works_well", "[]")
        if isinstance(what_works, str):
            try:
                what_works = json.loads(what_works)
            except (json.JSONDecodeError, TypeError):
                what_works = []

        principles = profile.get("key_principles", "[]")
        if isinstance(principles, str):
            try:
                principles = json.loads(principles)
            except (json.JSONDecodeError, TypeError):
                principles = []

        comm_style = profile.get("communication_style", "")

        return f"""You are an AI agent acting as a proxy for the user. You review and comment on
Devin coding sessions on behalf of the user. Your personality and preferences are based on the
user's actual behavior patterns extracted from their previous sessions.

USER PROFILE:
- Preferred tech stack: {json.dumps(tech_stack)}
- Coding conventions: {json.dumps(conventions)}
- Architectural preferences: {json.dumps(arch_prefs)}
- Communication style: {comm_style}
- What frustrates the user: {json.dumps(frustrations)}
- What works well: {json.dumps(what_works)}
- Key principles: {json.dumps(principles)}

BEHAVIOR RULES:
1. Be direct and concise — the user hates unnecessary verbosity
2. Focus on actionable feedback, not explanations
3. If something doesn't match user's preferences, point it out specifically
4. Always suggest the BEST solution, not multiple options
5. The user wants autonomous systems — flag anything that requires manual intervention
6. Never accept simulated or fake results — demand ground truth
7. If a session appears stalled, nudge it to continue
8. Comment in English unless the session context is in Slovak"""

    async def build_enriched_prompt(
        self,
        original_prompt: str,
        app_name: Optional[str] = None,
        decisions_history: Optional[list] = None,
        corrections_history: Optional[list] = None,
    ) -> str:
        """Enrich a user prompt with context from metadata."""
        context_parts = []

        # Add app-specific context
        if app_name and self._apps_cache:
            app_data = None
            for app in self._apps_cache:
                name = app.get("name", "")
                if isinstance(name, str) and name.lower() == app_name.lower():
                    app_data = app
                    break
            if app_data:
                tech_stack = app_data.get("tech_stack", "[]")
                if isinstance(tech_stack, str):
                    try:
                        tech_stack = json.loads(tech_stack)
                    except (json.JSONDecodeError, TypeError):
                        tech_stack = []
                requirements = app_data.get("requirements", "[]")
                if isinstance(requirements, str):
                    try:
                        requirements = json.loads(requirements)
                    except (json.JSONDecodeError, TypeError):
                        requirements = []

                context_parts.append(
                    f"PROJECT CONTEXT for '{app_name}':\n"
                    f"- Status: {app_data.get('status', 'unknown')}\n"
                    f"- Tech stack: {json.dumps(tech_stack)}\n"
                    f"- Requirements: {json.dumps(requirements)}\n"
                    f"- Description: {app_data.get('description', '')}"
                )

        # Add relevant decisions
        if decisions_history:
            recent = decisions_history[-10:]  # Last 10 decisions for this project
            decisions_text = "\n".join(
                f"- [{d.get('date', '')}] {d.get('decision', '')}"
                for d in recent
            )
            context_parts.append(f"PREVIOUS DECISIONS:\n{decisions_text}")

        # Add relevant corrections (important — avoid repeating mistakes)
        if corrections_history:
            corrections_text = "\n".join(
                f"- {c.get('correction', '')}"
                for c in corrections_history
            )
            context_parts.append(
                f"PAST CORRECTIONS (avoid these mistakes):\n{corrections_text}"
            )

        # Add user preferences
        if self._profile_cache:
            profile = self._profile_cache
            tech_stack = profile.get("preferred_tech_stack", "[]")
            if isinstance(tech_stack, str):
                try:
                    tech_stack = json.loads(tech_stack)
                except (json.JSONDecodeError, TypeError):
                    tech_stack = []
            frustrations = profile.get("frustrations", "[]")
            if isinstance(frustrations, str):
                try:
                    frustrations = json.loads(frustrations)
                except (json.JSONDecodeError, TypeError):
                    frustrations = []
            principles = profile.get("key_principles", "[]")
            if isinstance(principles, str):
                try:
                    principles = json.loads(principles)
                except (json.JSONDecodeError, TypeError):
                    principles = []

            context_parts.append(
                f"USER PREFERENCES:\n"
                f"- Preferred tech stack: {json.dumps(tech_stack)}\n"
                f"- Frustrations to avoid: {json.dumps(frustrations)}\n"
                f"- Key principles: {json.dumps(principles)}"
            )

        if not context_parts:
            return original_prompt

        context_block = "\n\n".join(context_parts)
        return f"""=== DEVBRAIN CONTEXT (from user's session history) ===
{context_block}
=== END CONTEXT ===

{original_prompt}"""

    async def review_session_output(
        self,
        session_title: str,
        session_messages: list,
        app_name: Optional[str] = None,
    ) -> dict:
        """Review a session's output and determine if correction is needed.

        Returns:
            dict with keys: review_result, comment, details
            review_result: on_track | needs_correction | stalled | completed
        """
        system_prompt = self._build_system_prompt()

        # Build conversation summary from messages
        msg_summary = []
        for msg in session_messages[-20:]:  # Last 20 messages
            origin = msg.get("origin", msg.get("type", "unknown"))
            text = msg.get("message", "")
            if text:
                truncated = text[:500] + "..." if len(text) > 500 else text
                msg_summary.append(f"[{origin}]: {truncated}")

        conversation = "\n".join(msg_summary)

        review_prompt = f"""Review this Devin coding session and determine its status.

Session: {session_title}
{f'Project: {app_name}' if app_name else ''}

Recent conversation:
{conversation}

Analyze and return JSON:
{{
    "review_result": "on_track|needs_correction|stalled|completed",
    "needs_comment": true/false,
    "comment": "Comment to send to Devin if needed (as the user would say it)",
    "details": "Brief explanation of your assessment",
    "issues_found": ["list of specific issues if any"]
}}

Rules:
- "stalled" = no meaningful progress in recent messages, or session seems stuck
- "needs_correction" = output doesn't match user preferences or has issues
- "on_track" = session is progressing well
- "completed" = task appears done successfully
- If needs_comment is true, write the comment as the user would — direct, concise, actionable
- Return ONLY valid JSON"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": review_prompt},
                ],
                temperature=0.3,
                max_tokens=1000,
            )
            text = response.choices[0].message.content.strip()
            if text.startswith("```"):
                parts = text.split("\n", 1)
                text = parts[1] if len(parts) > 1 else text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
            return json.loads(text)
        except Exception as e:
            logger.error(f"Review session error: {e}")
            return {
                "review_result": "on_track",
                "needs_comment": False,
                "comment": "",
                "details": f"Review failed: {str(e)}",
                "issues_found": [],
            }

    async def generate_nudge(self, session_title: str, last_activity: str) -> str:
        """Generate a nudge message for a stalled session."""
        system_prompt = self._build_system_prompt()

        nudge_prompt = f"""The Devin session "{session_title}" appears stalled.
Last activity: {last_activity}

Write a brief, direct message to Devin to continue working on the task.
The message should be from the user's perspective — direct and actionable.
Return ONLY the message text, no JSON wrapper."""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": nudge_prompt},
                ],
                temperature=0.5,
                max_tokens=200,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Generate nudge error: {e}")
            return "Please continue with the current task. What's the status?"

    async def generate_correction(
        self,
        session_title: str,
        issue: str,
        context: str,
    ) -> str:
        """Generate a correction comment for a session."""
        system_prompt = self._build_system_prompt()

        correction_prompt = f"""Session: {session_title}
Issue detected: {issue}
Context: {context}

Write a correction message to Devin as the user would say it.
Be direct, specific, and actionable. No pleasantries.
Return ONLY the message text."""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": correction_prompt},
                ],
                temperature=0.4,
                max_tokens=300,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Generate correction error: {e}")
            return f"Fix this issue: {issue}"
