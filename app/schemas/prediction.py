from pydantic import BaseModel, Field


class SentimentPrediction(BaseModel):
    text: str = Field(..., description="Input comment text")
    label: str = Field(..., description="Predicted sentiment label")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Prediction confidence score")


class BatchPredictionResponse(BaseModel):
    model_name: str
    model_version: str
    total_items: int
    predictions: list[SentimentPrediction]
