import { config } from "../config.js";

export type MlForecastResponse = {
  item_id: string;
  predictions: number[];
  model: string;
};

export async function requestMlForecast(params: {
  itemId: string;
  history: number[];
  horizonDays: number;
}): Promise<MlForecastResponse> {
  const base = config.mlServiceUrl;
  if (!base) {
    throw new Error("ML_SERVICE_URL is not configured");
  }
  const url = `${base}/internal/forecast`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": config.mlInternalKey,
    },
    body: JSON.stringify({
      item_id: params.itemId,
      history: params.history,
      horizon_days: params.horizonDays,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ML service error ${res.status}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text) as MlForecastResponse;
}
