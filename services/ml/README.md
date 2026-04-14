# Inventory ML service (FastAPI)

Internal forecast API used by the Node backend when `ML_SERVICE_URL` is set.

## Run locally

```bash
cd services/ml
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
set ML_INTERNAL_KEY=dev-ml-key-change-me
python -m uvicorn app.main:app --reload --port 8001
```

- Health (no key): [http://127.0.0.1:8001/health](http://127.0.0.1:8001/health)
- Forecast: `POST /internal/forecast` with header `X-Internal-Key` matching `ML_INTERNAL_KEY` and JSON body:

```json
{
  "item_id": "uuid",
  "history": [1.0, -2.0, 0.5],
  "horizon_days": 14
}
```

Match `ML_INTERNAL_KEY` with the same variable in `apps/api/.env`.

## Docker

From repo root: `docker compose up -d ml` (builds this image).
