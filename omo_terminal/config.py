"""Configuration defaults and TOML loader for omo-terminal."""
from __future__ import annotations

import os
import tomllib
from pathlib import Path
from types import SimpleNamespace

DEFAULT_CONFIG_PATH = Path(
    os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")
) / "omo-terminal/config.toml"

DEFAULTS = {
    "server": {
        "host": "127.0.0.1",
        "port": 8795,
        "browser": "",
        "open_app": True,
    },
    "agent": {
        "model": "gemini-3.8-flash-high",
        "mode": "accept-edits",
        "effort": "high",
        "dangerously_skip_permissions": True,
    },
    "ui": {
        "crt_shader": True,
        "audio_enabled": False,
    },
}


def _merge(base: dict, override: dict) -> dict:
    merged = dict(base)
    for k, v in override.items():
        if k in merged and isinstance(merged[k], dict) and isinstance(v, dict):
            merged[k] = _merge(merged[k], v)
        else:
            merged[k] = v
    return merged


def _to_namespace(data: dict) -> SimpleNamespace:
    ns = SimpleNamespace()
    for k, v in data.items():
        if isinstance(v, dict):
            setattr(ns, k, _to_namespace(v))
        else:
            setattr(ns, k, v)
    return ns


def load(path: Path | None = None) -> SimpleNamespace:
    cfg_path = path or Path(os.environ.get("OMO_TERMINAL_CONFIG", DEFAULT_CONFIG_PATH))
    raw = DEFAULTS
    found = False
    if cfg_path.is_file():
        try:
            with cfg_path.open("rb") as f:
                loaded = tomllib.load(f)
                raw = _merge(DEFAULTS, loaded)
                found = True
        except Exception:
            pass

    cfg = _to_namespace(raw)
    cfg.config_path = cfg_path
    cfg.config_found = found
    return cfg
