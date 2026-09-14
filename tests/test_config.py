from omo_terminal.config import load, _merge


def test_merge_dicts():
    base = {"a": 1, "sub": {"b": 2, "c": 3}}
    override = {"sub": {"c": 99, "d": 4}}
    res = _merge(base, override)
    assert res["a"] == 1
    assert res["sub"]["b"] == 2
    assert res["sub"]["c"] == 99
    assert res["sub"]["d"] == 4


def test_load_defaults():
    cfg = load()
    assert cfg.server.port == 8795
    assert cfg.server.host == "127.0.0.1"
    assert "gemini" in cfg.agent.model
    assert cfg.ui.crt_shader is True
    assert cfg.ui.audio_enabled is False
