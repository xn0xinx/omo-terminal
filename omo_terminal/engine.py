"""Antigravity agent engine wrapping the agy CLI."""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import signal
import subprocess
from typing import Any

from .config import load as load_config
from .router import EventRouter

DEFAULT_MODELS = [
    {"id": "gemini-3.8-flash-high", "name": "Gemini 3.8 Flash (High)", "provider": "Google"},
    {"id": "gemini-3.7-flash-high", "name": "Gemini 3.7 Flash (High)", "provider": "Google"},
    {"id": "gemini-3.1-pro-high", "name": "Gemini 3.1 Pro (High)", "provider": "Google"},
    {"id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6", "provider": "Anthropic"},
    {"id": "claude-opus-4-6-thinking", "name": "Claude Opus 4.6", "provider": "Anthropic"},
    {"id": "gpt-oss-120b-medium", "name": "GPT-OSS 120B (Medium)", "provider": "OpenAI"},
    {"id": "ollama:llama3", "name": "Ollama (Local Llama 3)", "provider": "Ollama"},
]


class Engine:
    """Manages the persistent agy CLI subprocess and distributes events."""

    def __init__(self, cfg: Any | None = None) -> None:
        self.cfg = cfg or load_config()
        self.router = EventRouter()
        self.current_model: str = self.cfg.agent.model
        self.current_mode: str = self.cfg.agent.mode
        self.subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
        self.process: asyncio.subprocess.Process | None = None
        self._reader_task: asyncio.Task | None = None
        self._working: bool = False
        self.conversation_id: str = ""
        self.available_models: list[dict[str, str]] = list(DEFAULT_MODELS)

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        q: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=500)
        self.subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[dict[str, Any]]) -> None:
        self.subscribers.discard(q)

    def broadcast(self, event: dict[str, Any]) -> None:
        dead: list[asyncio.Queue[dict[str, Any]]] = []
        for q in self.subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                dead.append(q)
        for d in dead:
            self.subscribers.discard(d)

    async def start(self) -> None:
        """Start the agy child process in stream-json mode."""
        await self.refresh_models()
        await self._spawn_process()

    async def refresh_models(self) -> None:
        """Query `agy models` to fetch live available models."""
        agy_bin = shutil.which("agy")
        if not agy_bin:
            return
        try:
            proc = await asyncio.create_subprocess_exec(
                agy_bin, "models",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5.0)
            text = stdout.decode(errors="ignore")
            parsed: list[dict[str, str]] = []
            for line in text.splitlines():
                parts = line.strip().split(None, 1)
                if len(parts) == 2 and not parts[0].startswith("⠋") and not parts[0].startswith("Fetch"):
                    mid, mname = parts[0], parts[1].strip()
                    provider = "Google" if "gemini" in mid else "Anthropic" if "claude" in mid else "OpenAI"
                    parsed.append({"id": mid, "name": mname, "provider": provider})
            if parsed:
                # Append Ollama option
                parsed.append({"id": "ollama:llama3", "name": "Ollama (Local Llama 3)", "provider": "Ollama"})
                self.available_models = parsed
        except Exception:
            pass

    async def _spawn_process(self) -> None:
        if self.process and self.process.returncode is None:
            return

        agy_bin = shutil.which("agy") or "agy"
        cmd = [
            agy_bin,
            "--input-format", "stream-json",
            "--output-format", "stream-json",
            "--model", self.current_model,
        ]
        if self.cfg.agent.dangerously_skip_permissions:
            cmd.append("--dangerously-skip-permissions")

        self.process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        self._reader_task = asyncio.create_task(self._read_stdout())

    async def _read_stdout(self) -> None:
        if not self.process or not self.process.stdout:
            return
        while True:
            line = await self.process.stdout.readline()
            if not line:
                break
            text = line.decode(errors="replace")
            events = self.router.route_line(text)
            for ev in events:
                if ev.get("type") == "init":
                    self.conversation_id = ev.get("conversation_id", "")
                elif ev.get("type") == "result":
                    self._working = False
                self.broadcast(ev)

        self._working = False

    async def send(self, prompt: str) -> None:
        """Send a user message to agy."""
        if not prompt.strip():
            return
        if not self.process or self.process.returncode is not None:
            await self._spawn_process()

        self._working = True
        self.broadcast({"type": "user_msg", "text": prompt})
        self.broadcast({
            "type": "status",
            "status": "ONLINE [PROCESSING]",
            "action": "THINKING",
            "mascot": "thinking",
        })
        self.broadcast({
            "type": "telemetry_left",
            "lines": [f"> prompt: {prompt[:40]}..."],
        })

        payload = json.dumps({"event": "user", "message": {"content": prompt}}) + "\n"
        if self.process and self.process.stdin:
            self.process.stdin.write(payload.encode())
            await self.process.stdin.drain()

    async def interrupt(self) -> None:
        """Interrupt current turn."""
        if self.process and self.process.returncode is None:
            try:
                self.process.send_signal(signal.SIGINT)
            except ProcessLookupError:
                pass
        self._working = False
        self.broadcast({
            "type": "status",
            "status": "ONLINE [INTERRUPTED]",
            "action": "HALTED",
            "mascot": "idle",
        })

    async def set_model(self, model_id: str) -> None:
        """Change active model by respawning agy with new model flag."""
        if model_id == self.current_model:
            return
        self.current_model = model_id
        await self.interrupt()
        if self.process and self.process.returncode is None:
            self.process.terminate()
            try:
                await asyncio.wait_for(self.process.wait(), timeout=2.0)
            except asyncio.TimeoutError:
                self.process.kill()
        await self._spawn_process()
        self.broadcast({
            "type": "status",
            "status": "ONLINE",
            "action": f"MODEL: {model_id}",
            "mascot": "idle",
        })

    async def shutdown(self) -> None:
        if self.process and self.process.returncode is None:
            self.process.terminate()
            try:
                await asyncio.wait_for(self.process.wait(), timeout=2.0)
            except asyncio.TimeoutError:
                self.process.kill()
        if self._reader_task:
            self._reader_task.cancel()
