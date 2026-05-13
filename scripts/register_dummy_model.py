import argparse
import sys
import tempfile
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import mlflow
from mlflow.pyfunc import PythonModel

from app.core.config import get_settings
from app.ml.tracking.mlflow_tracking_service import MlflowTrackingService


class DummySentimentModel(PythonModel):
    def predict(self, context, model_input, params=None):
        if hasattr(model_input, "__len__"):
            return ["neutral"] * len(model_input)
        return ["neutral"]


def register_dummy_model(run_name: str, registered_model_name: str | None = None) -> tuple[str, str]:
    settings = get_settings()
    tracker = MlflowTrackingService()

    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    mlflow.set_experiment(settings.mlflow_experiment_name)

    with mlflow.start_run(run_name=run_name) as run:
        mlflow.log_params(
            {
                "model_type": "dummy_pyfunc",
                "model_source": "bootstrap_script",
                "label_space": "positive,neutral,negative",
            }
        )
        mlflow.log_metrics(
            {
                "accuracy": 0.8,
                "precision": 0.8,
                "recall": 0.8,
                "f1-score": 0.8,
            }
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            artifact_path = Path(temp_dir) / "notes.txt"
            artifact_path.write_text("Dummy model bootstrap artifact for MLflow registry.", encoding="utf-8")
            mlflow.log_artifact(artifact_path.as_posix())

        mlflow.pyfunc.log_model(
            artifact_path="model",
            python_model=DummySentimentModel(),
            registered_model_name=None,
        )

        model_version = tracker.register_model(
            run_id=run.info.run_id,
            artifact_path="model",
            registered_model_name=registered_model_name,
        )

        return run.info.run_id, model_version.version


def main() -> None:
    parser = argparse.ArgumentParser(description="Create one MLflow run and register a dummy sentiment model.")
    parser.add_argument("--run-name", default="bootstrap-dummy-sentiment-model")
    parser.add_argument("--model-name", default=None, help="Override registered model name")
    args = parser.parse_args()

    run_id, version = register_dummy_model(
        run_name=args.run_name,
        registered_model_name=args.model_name,
    )
    print(f"MLflow run created: {run_id}")
    print(f"Model registered successfully. Version: {version}")


if __name__ == "__main__":
    main()
