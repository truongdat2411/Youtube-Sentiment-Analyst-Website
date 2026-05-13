import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, ProgrammingError
from starlette import status

logger = logging.getLogger("app.exceptions")


class AppException(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()},
        )

    @app.exception_handler(ProgrammingError)
    async def sqlalchemy_programming_handler(request: Request, exc: ProgrammingError) -> JSONResponse:
        logger.exception(
            "SQLAlchemy ProgrammingError path=%s",
            request.url.path,
            exc_info=exc,
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": (
                    "Cơ sở dữ liệu chưa khớp schema (ví dụ thiếu bảng users). "
                    "Chạy migration: alembic upgrade head. "
                    "Docker: docker compose exec backend alembic upgrade head"
                )
            },
        )

    @app.exception_handler(OperationalError)
    async def sqlalchemy_operational_handler(request: Request, exc: OperationalError) -> JSONResponse:
        logger.exception(
            "SQLAlchemy OperationalError path=%s",
            request.url.path,
            exc_info=exc,
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": (
                    "Không kết nối được PostgreSQL hoặc lỗi thực thi SQL. "
                    "Kiểm tra DATABASE_URL và container db đã healthy."
                )
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "Unhandled error request_id=%s path=%s",
            getattr(request.state, "request_id", "unknown"),
            request.url.path,
            exc_info=exc,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )
