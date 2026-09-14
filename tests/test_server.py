from fastapi.testclient import TestClient
from omo_terminal.config import load
from omo_terminal.engine import Engine
from omo_terminal.server import create_app


def test_api_health_and_models():
    cfg = load()
    engine = Engine(cfg)
    app = create_app(engine)
    client = TestClient(app)

    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"

    resp_models = client.get("/api/models")
    assert resp_models.status_code == 200
    models_data = resp_models.json()
    assert "gemini-3.8-flash-high" in [m["id"] for m in models_data["models"]]


def test_serve_index():
    cfg = load()
    engine = Engine(cfg)
    app = create_app(engine)
    client = TestClient(app)

    resp = client.get("/")
    assert resp.status_code == 200
    assert "OmoTerminal" in resp.text


def test_api_theme():
    cfg = load()
    engine = Engine(cfg)
    app = create_app(engine)
    client = TestClient(app)

    resp = client.get("/api/theme")
    assert resp.status_code == 200
    data = resp.json()
    assert "name" in data
    assert "palette" in data
    assert "bg" in data["palette"]
    assert "fg" in data["palette"]
    assert "bright" in data["palette"]

