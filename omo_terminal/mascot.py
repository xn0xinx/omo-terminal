"""Map Antigravity tools and commands to mascot animation tags."""
from __future__ import annotations

import re

TAGS = (
    "idle",          # neutral breathing & code shimmer
    "thinking",      # model is processing / thinking
    "reading",       # view_file, read_url, cat, ls -> glowing document held up
    "writing",       # replace_file_content, write_to_file -> glowing stylus etching
    "searching",     # grep_search, find_by_name -> radar/scanner lens
    "shell",         # run_command -> typing on mini terminal
    "testing",       # run_command with test runners
    "git",           # git operations
    "waiting-user",  # waiting on user input
    "success",       # turn finished successfully
    "failure",       # error or glitch crumble
)

_BASH_RULES: tuple[tuple[str, str], ...] = (
    (r"\b(pytest|jest|vitest|tox|unittest|playwright)\b", "testing"),
    (r"\b(go|cargo|npm|pnpm|yarn|bun|make)\b[^&|;]*\btests?\b", "testing"),
    (r"\bgit\b", "git"),
    (r"\b(grep|rg|ag|ack)\b", "searching"),
    (r"\b(find|fd|locate)\b", "searching"),
    (r"\b(cat|bat|less|more|head|tail|ls|tree|stat)\b", "reading"),
    (r"\b(sed|awk|echo|tee)\b[^>]*>", "writing"),
)
_BASH = tuple((re.compile(p), tag) for p, tag in _BASH_RULES)

_TOOLS: dict[str, str] = {
    "view_file": "reading",
    "read_url_content": "reading",
    "read_browser_page": "reading",
    "list_dir": "reading",
    "list_resources": "reading",
    "read_resource": "reading",
    "write_to_file": "writing",
    "replace_file_content": "writing",
    "multi_replace_file_content": "writing",
    "notebook_edit": "writing",
    "sed_file": "writing",
    "grep_search": "searching",
    "find_by_name": "searching",
    "search_web": "searching",
    "ask_question": "waiting-user",
    "ask_permission": "waiting-user",
}


def for_bash(command: str) -> str:
    cmd = (command or "").lower()
    for rx, tag in _BASH:
        if rx.search(cmd):
            return tag
    return "shell"


def for_tool(tool_name: str, tool_info: dict | None = None) -> str:
    params = (tool_info or {}).get("parameters", {}) if tool_info else {}
    if tool_name == "run_command":
        cmd = str(params.get("CommandLine", ""))
        return for_bash(cmd)
    return _TOOLS.get(tool_name, "thinking")
