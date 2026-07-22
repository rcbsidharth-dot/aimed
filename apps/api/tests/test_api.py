import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.db.session import init_db
from app.main import app


@pytest_asyncio.fixture
async def client():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_search(client):
    r = await client.post("/api/v1/search", json={"query": "I have headache"})
    assert r.status_code == 200
    data = r.json()
    assert "possible_diseases" in data or "raw" in data
    assert "disclaimer" in data


@pytest.mark.asyncio
async def test_emergency_list(client):
    r = await client.get("/api/v1/emergency")
    assert r.status_code == 200
    assert len(r.json()["items"]) >= 8


@pytest.mark.asyncio
async def test_bmi(client):
    r = await client.post("/api/v1/nutrition/bmi", json={"weight_kg": 70, "height_cm": 170})
    assert r.status_code == 200
    assert r.json()["category"] in {"underweight", "normal", "overweight", "obesity"}


@pytest.mark.asyncio
async def test_chat(client):
    r = await client.post("/api/v1/chat", json={"message": "What helps a mild sore throat?"})
    assert r.status_code == 200
    assert "reply" in r.json()
