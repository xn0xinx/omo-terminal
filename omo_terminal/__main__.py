"""Entry point for omo-terminal: starts server and opens the CRT window."""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
import urllib.request
from pathlib import Path

import uvicorn

from . import __version__, util
from .config import load as load_config
from .engine import Engine
from .server import create_app

_BROWSERS = (
    "chromium", "chromium-browser", "google-chrome-stable",
    "google-chrome", "brave", "brave-browser",
)
_PROFILE_DIR = Path.home() / ".local/share/omo-terminal/browser"


def _open_ui(cfg, url: str) -> None:
    if not cfg.server.open_app:
        return
    binary = cfg.server.browser or util.which(*_BROWSERS)
    if binary and any(tag in Path(binary).name for tag in ("chrom", "brave")):
        _PROFILE_DIR.mkdir(parents=True, exist_ok=True)
        util.spawn_detached([
            binary,
            f"--user-data-dir={_PROFILE_DIR}",
            f"--app={url}",
            "--class=omo-terminal",
            f"--user-data-dir={_PROFILE_DIR}",
            "--no-first-run",
            "--no-default-browser-check",
            "--window-size=1280,820",
        ])
        return
    if binary:
        util.spawn_detached([binary, url])
        return
    opener = util.which("xdg-open")
    if opener:
        util.spawn_detached([opener, url])
    else:
        print(f"omo-terminal: open {url} in your browser", file=sys.stderr)


def _running_instance(cfg) -> bool:
    if not util.port_open(cfg.server.host, cfg.server.port, 0.5):
        return False
    url = f"http://{cfg.server.host}:{cfg.server.port}/api/health"
    try:
        with urllib.request.urlopen(url, timeout=1) as resp:
            return json.load(resp).get("status") == "ok"
    except Exception:
        return False


async def _serve(cfg, engine: Engine) -> None:
    app = create_app(engine)
    uconf = uvicorn.Config(
        app,
        host=cfg.server.host,
        port=cfg.server.port,
        log_level="warning",
        access_log=False,
    )
    server = uvicorn.Server(uconf)
    url = f"http://{cfg.server.host}:{cfg.server.port}/"

    async def _opener() -> None:
        if await util.wait_for_port(cfg.server.host, cfg.server.port, 10):
            _open_ui(cfg, url)

    await asyncio.gather(server.serve(), _opener())


def main() -> None:
    parser = argparse.ArgumentParser(description="omo-terminal: Retro CRT Antigravity client")
    parser.add_argument("-p", "--port", type=int, help="Server port (default: 8795)")
    parser.add_argument("--host", type=str, help="Server host (default: 127.0.0.1)")
    parser.add_argument("--no-open", action="store_true", help="Don't open the browser window")
    parser.add_argument("--model", type=str, help="Initial model to use")
    parser.add_argument("-v", "--version", action="version", version=f"omo-terminal {__version__}")
    args = parser.parse_args()

    cfg = load_config()
    if args.port:
        cfg.server.port = args.port
    if args.host:
        cfg.server.host = args.host
    if args.no_open:
        cfg.server.open_app = False
    if args.model:
        cfg.agent.model = args.model

    if _running_instance(cfg):
        print(f"omo-terminal already running on http://{cfg.server.host}:{cfg.server.port}/")
        if not args.no_open:
            _open_ui(cfg, f"http://{cfg.server.host}:{cfg.server.port}/")
        return

    engine = Engine(cfg)
    try:
        asyncio.run(_serve(cfg, engine))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
