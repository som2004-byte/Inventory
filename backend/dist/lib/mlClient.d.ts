export type MlForecastResponse = {
    item_id: string;
    predictions: number[];
    model: string;
};
export declare function requestMlForecast(params: {
    itemId: string;
    history: number[];
    horizonDays: number;
}): Promise<MlForecastResponse>;
