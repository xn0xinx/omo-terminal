import json
from omo_terminal.router import EventRouter, format_tool_summary


def test_format_tool_summary():
    assert format_tool_summary("run_command", {"CommandLine": "ls -la /tmp"}) == "> ls -la /tmp"
    assert format_tool_summary("view_file", {"AbsolutePath": "/home/noxin/test.py"}) == "view: test.py"
    assert format_tool_summary("grep_search", {"Query": "pattern"}) == "grep: pattern"


def test_router_init_event():
    router = EventRouter()
    raw = json.dumps({
        "event": "init",
        "conversation_id": "test-123",
        "init": {"cwd": "/home/noxin/Work", "tools": ["run_command", "view_file"]},
    })
    events = router.route_line(raw)
    assert len(events) == 2
    assert events[0]["type"] == "init"
    assert events[0]["conversation_id"] == "test-123"
    assert events[1]["type"] == "status"
    assert events[1]["mascot"] == "idle"


def test_router_tool_lifecycle():
    router = EventRouter()
    # Tool active
    active_line = json.dumps({
        "event": "step_update",
        "step_update": {
            "step_type": "tool",
            "state": "ACTIVE",
            "tool_name": "view_file",
            "tool_info": {"parameters": {"AbsolutePath": "/home/noxin/code.py"}},
        },
    })
    evs = router.route_line(active_line)
    assert any(e["type"] == "tool_start" and e["mascot"] == "reading" for e in evs)

    # Tool done
    done_line = json.dumps({
        "event": "step_update",
        "step_update": {
            "step_type": "tool",
            "state": "DONE",
            "tool_name": "view_file",
            "duration_seconds": 0.05,
            "tool_info": {"output": "print('hello')\n"},
        },
    })
    evs_done = router.route_line(done_line)
    assert any(e["type"] == "tool_end" for e in evs_done)
    assert any(e["type"] == "telemetry_right" for e in evs_done)


def test_router_result():
    router = EventRouter()
    line = json.dumps({
        "event": "result",
        "result": {"status": "SUCCESS", "response": "done"},
    })
    evs = router.route_line(line)
    assert any(e["type"] == "result" and e["ok"] is True and e["mascot"] == "success" for e in evs)
