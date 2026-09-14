from omo_terminal import mascot


def test_mascot_tags_defined():
    assert "reading" in mascot.TAGS
    assert "writing" in mascot.TAGS
    assert "searching" in mascot.TAGS
    assert "shell" in mascot.TAGS
    assert "idle" in mascot.TAGS
    assert "thinking" in mascot.TAGS


def test_for_tool_file_reading():
    assert mascot.for_tool("view_file") == "reading"
    assert mascot.for_tool("read_url_content") == "reading"
    assert mascot.for_tool("list_dir") == "reading"


def test_for_tool_file_writing():
    assert mascot.for_tool("write_to_file") == "writing"
    assert mascot.for_tool("replace_file_content") == "writing"


def test_for_tool_search():
    assert mascot.for_tool("grep_search") == "searching"
    assert mascot.for_tool("find_by_name") == "searching"


def test_for_bash_commands():
    assert mascot.for_bash("pytest -v") == "testing"
    assert mascot.for_bash("git status") == "git"
    assert mascot.for_bash("cat /etc/hosts") == "reading"
    assert mascot.for_bash("rg 'def main'") == "searching"
    assert mascot.for_bash("uptime") == "shell"
