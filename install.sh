#!/usr/bin/env bash
# omo-terminal installer for Omarchy / Arch.
#
# - sets up a python virtual environment in ~/.local/share/omo-terminal/venv
# - installs package dependencies
# - creates launcher script at ~/.local/bin/omo-terminal
# - installs .desktop entry at ~/.local/share/applications/
# - seeds default ~/.config/omo-terminal/config.toml
#
# Re-runnable. Nothing here needs sudo.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN="$HOME/.local/bin"
CONFDIR="${XDG_CONFIG_HOME:-$HOME/.config}/omo-terminal"
APPDIR="$HOME/.local/share/applications"
VENV="$HOME/.local/share/omo-terminal/venv"

say() { printf '\033[1;32m::\033[0m %s\n' "$*"; }

mkdir -p "$BIN" "$CONFDIR" "$APPDIR"

# Virtual environment
say "setting up python virtual environment at $VENV..."
if [ ! -d "$VENV" ]; then
  python3 -m venv "$VENV"
fi

say "installing dependencies..."
"$VENV/bin/pip" install --upgrade pip >/dev/null 2>&1 || true
"$VENV/bin/pip" install -e "$REPO"

# Launcher script on PATH
cat > "$BIN/omo-terminal" <<LAUNCHER
#!/usr/bin/env bash
exec "$VENV/bin/omo-terminal" "\$@"
LAUNCHER
chmod +x "$BIN/omo-terminal"
say "installed launcher: $BIN/omo-terminal"

# Desktop entry
cp "$REPO/share/omo-terminal.desktop" "$APPDIR/omo-terminal.desktop"
say "installed desktop entry: $APPDIR/omo-terminal.desktop"

# Seed config if absent
if [ ! -f "$CONFDIR/config.toml" ]; then
  cat > "$CONFDIR/config.toml" <<CONF
[server]
host = "127.0.0.1"
port = 8795
browser = ""
open_app = true

[agent]
model = "gemini-3.8-flash-high"
mode = "accept-edits"
effort = "high"
dangerously_skip_permissions = true

[ui]
crt_shader = true
audio_enabled = false
CONF
  say "created initial config at $CONFDIR/config.toml"
fi

say "omo-terminal installed successfully! Run 'omo-terminal' to launch."
