"""Parse raw agy stream-json lines into clean UI events."""
from __future__ import annotations

import json
from typing import Any

from . import mascot


def format_tool_summary(name: str, params: dict[str, Any]) -> str:
    """Format a compact terminal line for tool calls."""
    if name == "run_command":
        cmd = params.get("CommandLine", "")
        return f"> {cmd[:60]}"
    if name in ("view_file", "write_to_file", "replace_file_content"):
        path = params.get("TargetFile") or params.get("AbsolutePath") or ""
        short = path.split("/")[-1] if path else ""
        return f"{name[:4]}: {short}"
    if name == "grep_search":
        q = params.get("Query", "")
        return f"grep: {q[:30]}"
    if name == "find_by_name":
        p = params.get("Pattern", "")
        return f"find: {p[:30]}"
    return f"{name}()"


class EventRouter:
    """Stateful router translating agy NDJSON events to frontend WebSocket messages."""

    def __init__(self) -> None:
        self.conversation_id: str = ""
        self.current_response: str = ""
        self.active_tool: str | None = None

    def route_line(self, line: str) -> list[dict[str, Any]]:
        line = line.strip()
        if not line:
            return []
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            return [{"type": "raw_log", "text": line}]

        event = data.get("event")
        events: list[dict[str, Any]] = []

        if event == "init":
            self.conversation_id = data.get("conversation_id", "")
            init_data = data.get("init", {})
            events.append({
                "type": "init",
                "conversation_id": self.conversation_id,
                "cwd": init_data.get("cwd", ""),
                "tools": init_data.get("tools", []),
            })
            events.append({
                "type": "status",
                "status": "ONLINE",
                "action": "READY",
                "mascot": "idle",
            })

        elif event == "step_update":
            su = data.get("step_update", {})
            step_type = su.get("step_type")
            state = su.get("state")

            if step_type == "agent_response":
                delta = su.get("text_delta", "")
                if delta:
                    self.current_response += delta
                    events.append({
                        "type": "assistant_delta",
                        "delta": delta,
                        "mascot": "thinking",
                    })
                    # Right telemetry code stream
                    events.append({
                        "type": "telemetry_right",
                        "chunk": delta,
                    })

                if state == "DONE":
                    events.append({
                        "type": "status",
                        "status": "ONLINE",
                        "action": "RESPONSE FINISHED",
                        "mascot": "idle",
                    })

            elif step_type == "tool":
                tool_name = su.get("tool_name", "")
                tool_info = su.get("tool_info", {})
                params = tool_info.get("parameters", {})
                tag = mascot.for_tool(tool_name, tool_info)

                if state == "ACTIVE":
                    self.active_tool = tool_name
                    summary = format_tool_summary(tool_name, params)
                    events.append({
                        "type": "tool_start",
                        "name": tool_name,
                        "mascot": tag,
                        "summary": summary,
                    })
                    events.append({
                        "type": "status",
                        "status": "ONLINE [PROCESSING]",
                        "action": f"{tag.upper()}: {summary}",
                        "mascot": tag,
                    })
                    # Left telemetry receives tool invocations and commands
                    events.append({
                        "type": "telemetry_left",
                        "lines": [summary],
                    })

                elif state == "DONE":
                    self.active_tool = None
                    out = tool_info.get("output", "")
                    dur = su.get("duration_seconds", 0.0)
                    events.append({
                        "type": "tool_end",
                        "name": tool_name,
                        "duration": dur,
                        "mascot": "idle",
                    })
                    if out:
                        # Feed snippets to telemetry
                        lines = [line[:80] for line in str(out).splitlines()[:10]]
                        if tool_name == "run_command":
                            events.append({"type": "telemetry_left", "lines": lines})
                        else:
                            events.append({"type": "telemetry_right", "lines": lines})

        elif event == "result":
            res = data.get("result", {})
            status = res.get("status", "SUCCESS")
            response = res.get("response", self.current_response)
            usage = res.get("usage", {})
            ok = status == "SUCCESS"
            events.append({
                "type": "result",
                "ok": ok,
                "status": status,
                "response": response,
                "usage": usage,
                "mascot": "success" if ok else "failure",
            })
            events.append({
                "type": "status",
                "status": "ONLINE" if ok else "ONLINE [ERROR]",
                "action": "IDLE" if ok else "ERROR",
                "mascot": "success" if ok else "failure",
            })
            self.current_response = ""

        return events
