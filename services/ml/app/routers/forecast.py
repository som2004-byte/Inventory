from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(tags=["forecast"])


class ForecastRequest(BaseModel):
    item_id: str = Field(..., description="Item UUID for logging only")
    history: list[float] = Field(default_factory=list, description="Daily net movement series")
    horizon_days: int = Field(14, ge=1, le=90)


class ForecastResponse(BaseModel):
    item_id: str
    predictions: list[float]
    model: str


def moving_average_forecast(history: list[float], horizon: int) -> list[float]:
    if not history:
        return [0.0] * horizon
    window = history[-7:]
    avg = sum(window) / len(window)
    rounded = round(avg * 100) / 100
    return [rounded] * horizon


@router.post("/forecast", response_model=ForecastResponse)
def forecast(body: ForecastRequest):
    preds = moving_average_forecast(body.history, body.horizon_days)
    return ForecastResponse(
        item_id=body.item_id,
        predictions=preds,
        model="moving_average_7d_fastapi_v1",
    )
