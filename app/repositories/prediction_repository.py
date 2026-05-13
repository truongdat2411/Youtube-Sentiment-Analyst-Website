from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prediction import Prediction


class PredictionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_many(self, predictions: list[Prediction]) -> list[Prediction]:
        self.session.add_all(predictions)
        await self.session.flush()
        return predictions
