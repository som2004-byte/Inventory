import os

from fastapi import Depends, FastAPI, Header, HTTPException

from app.routers import forecast

INTERNAL_KEY = os.getenv("ML_INTERNAL_KEY", "dev-ml-key-change-me")


def verify_internal_key(x_internal_key: str | None = Header(None, alias="X-Internal-Key")):
    if not x_internal_key or x_internal_key != INTERNAL_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing internal key")
    return True


app = FastAPI(title="Inventory ML", version="1.0.0")
app.include_router(forecast.router, prefix="/internal", dependencies=[Depends(verify_internal_key)])


@app.get("/health")
def health():
    return {"ok": True}
