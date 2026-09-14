"""FastAPI HTTP and WebSocket server for omo-terminal."""
from __future__ import annotations

import asyncio
import tomllib
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .engine import Engine

WEB_DIR = Path(__file__).parent / "web"


def get_os_default_theme() -> dict[str, Any]:
    """Read active Omarchy theme colors from state, with resilient defaults."""
    state_dir = Path.home() / ".local/state/omarchy/current"
    colors_file = state_dir / "theme" / "colors.toml"
    name_file = state_dir / "theme.name"

    theme_name = "inkypinky"
    if name_file.is_file():
        try:
            theme_name = name_file.read_text("utf-8").strip()
        except Exception:
            pass

    palette: dict[str, str] = {}
    if colors_file.is_file():
        try:
            palette = tomllib.loads(colors_file.read_text("utf-8"))
        except Exception:
            pass

    def pick(*keys: str, default: str = "#000000") -> str:
        for k in keys:
            val = palette.get(k)
            if val and isinstance(val, str):
                return val
        return default

    bg = pick("darker_background", "dark_background", "background", "color0", default="#13131D")
    fg = pick("foreground", "bright_foreground", "color15", default="#c8c8c8")
    bright = pick("color1", "accent", "bright_magenta", "color9", default="#EA90A8")
    accent = pick("accent", "color4", "color12", default="#7c7ca8")
    dim = pick("color8", "muted", "color7", default="#434353")
    dark = pick("color0", "dark_background", default="#101018")

    return {
        "name": theme_name,
        "palette": {
            "bg": bg,
            "fg": fg,
            "bright": bright,
            "accent": accent,
            "dim": dim,
            "dark": dark,
            "glow": bright,
            "glow_soft": accent,
            "bezel": "#0b0b12",
        },
    }


class SendPayload(BaseModel):
    text: str


class ModelPayload(BaseModel):
    model: str


def create_app(engine: Engine) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_: FastAPI):
        await engine.start()
        yield
        await engine.shutdown()

    app = FastAPI(title="omo-terminal", lifespan=lifespan)

    @app.get("/api/health")
    async def health():
        return {"status": "ok", "working": engine._working, "model": engine.current_model}

    @app.get("/api/models")
    async def models():
        return {"current": engine.current_model, "models": engine.available_models}

    @app.get("/api/theme")
    async def get_theme():
        return get_os_default_theme()


    @app.post("/api/send")
    async def send_msg(payload: SendPayload):
        asyncio.create_task(engine.send(payload.text))
        return {"status": "accepted"}

    @app.post("/api/interrupt")
    async def interrupt():
        await engine.interrupt()
        return {"status": "interrupted"}

    @app.post("/api/model")
    async def switch_model(payload: ModelPayload):
        await engine.set_model(payload.model)
        return {"status": "switched", "model": payload.model}

    @app.websocket("/ws")
    async def websocket_endpoint(ws: WebSocket):
        await ws.accept()
        q = engine.subscribe()
        try:
            # Send initial snapshot
            await ws.send_json({
                "type": "snapshot",
                "model": engine.current_model,
                "models": engine.available_models,
                "status": "ONLINE",
                "action": "READY",
                "mascot": "idle",
            })

            async def _reader():
                while True:
                    data = await ws.receive_json()
                    action = data.get("action")
                    if action == "send":
                        asyncio.create_task(engine.send(data.get("text", "")))
                    elif action == "interrupt":
                        await engine.interrupt()
                    elif action == "model":
                        await engine.set_model(data.get("model", ""))

            async def _writer():
                while True:
                    event = await q.get()
                    await ws.send_json(event)

            await asyncio.gather(_reader(), _writer())
        except (WebSocketDisconnect, asyncio.CancelledError):
            pass
        finally:
            engine.unsubscribe(q)

    # Static routes
    @app.get("/")
    async def serve_index():
        return FileResponse(WEB_DIR / "index.html")

    app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="static")
    return app
