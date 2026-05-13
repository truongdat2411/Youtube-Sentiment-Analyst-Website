import logging
from collections.abc import Mapping
from pathlib import Path
from typing import Any

import mlflow
from mlflow.entities.model_registry.model_version import ModelVersion

from app.core.config import get_settings
from app.core.exceptions import AppException

logger = logging.getLogger("app.ml.tracking")

REQUIRED_CLASSIFICATION_METRICS = {"accuracy", "precision", "recall", "f1-score"}


class MlflowTrackingService:
    def __init__(self) -> None:
        self.settings = get_settings()
        mlflow.set_tracking_uri(self.settings.mlflow_tracking_uri)
        mlflow.set_experiment(self.settings.mlflow_experiment_name)

    def _validate_required_metrics(self, metrics: Mapping[str, float]) -> None:
        missing_metrics = REQUIRED_CLASSIFICATION_METRICS - set(metrics.keys())
        if missing_metrics:
            missing = ", ".join(sorted(missing_metrics))
            raise AppException(f"Missing required MLflow metrics: {missing}")

    def log_experiment_run(
        self,
        run_name: str,
        params: Mapping[str, Any],
        metrics: Mapping[str, float],
        artifact_paths: list[str] | None = None,
    ) -> str:
        """
        Track one experiment run including params, required metrics and artifacts.
        Returns the MLflow run_id for downstream usage.
        """
        self._validate_required_metrics(metrics)

        with mlflow.start_run(run_name=run_name) as run:
            if params:
                mlflow.log_params(dict(params))
            if metrics:
                mlflow.log_metrics({key: float(value) for key, value in metrics.items()})

            if artifact_paths:
                for artifact_path in artifact_paths:
                    path = Path(artifact_path)
                    if not path.exists():
                        logger.warning("Skip missing artifact path=%s", artifact_path)
                        continue
                    if path.is_file():
                        mlflow.log_artifact(path.as_posix())
                    else:
                        mlflow.log_artifacts(path.as_posix())

            logger.info("Logged MLflow run_id=%s", run.info.run_id)
            return run.info.run_id

    def register_model(
        self,
        run_id: str,
        artifact_path: str = "model",
        registered_model_name: str | None = None,
    ) -> ModelVersion:
        """
        Register a model artifact from a completed MLflow run.
        Example model_uri: runs:/<run_id>/model
        """
        model_name = registered_model_name or self.settings.mlflow_registered_model_name
        model_uri = f"runs:/{run_id}/{artifact_path}"
        logger.info("Registering model uri=%s name=%s", model_uri, model_name)
        return mlflow.register_model(model_uri=model_uri, name=model_name)
