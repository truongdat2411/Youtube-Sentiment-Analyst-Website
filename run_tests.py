#!/usr/bin/env python
"""Test runner script with various options."""

import subprocess
import sys
from pathlib import Path


def run_command(cmd, description):
    """Run a command and print description."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"{'='*60}\n")
    result = subprocess.run(cmd, shell=True)
    return result.returncode == 0


def main():
    """Main test runner."""
    root_dir = Path(__file__).parent
    backend_dir = root_dir / "backend"

    print("YouTube Sentiment Analysis - Test Suite")
    print("=" * 60)

    # Check if pytest is installed
    try:
        import pytest  # noqa
    except ImportError:
        print("pytest not installed. Installing...")
        run_command(f"pip install -r {root_dir / 'requirements.txt'}", "Installing dependencies")

    # Test options
    print("\nAvailable test commands:")
    print("1. All tests with coverage")
    print("2. Only unit tests")
    print("3. Only YouTube tests")
    print("4. Only schema tests")
    print("5. Only API tests")
    print("6. Only model tests")
    print("7. Quick tests (no coverage)")
    print("8. Full test report with HTML coverage")

    choice = input("\nSelect option (1-8) or press Enter for all tests: ").strip()

    commands = {
        "1": (
            f"cd {backend_dir} && pytest tests/ -v --cov=app --cov-report=term-missing",
            "All tests with coverage"
        ),
        "2": (
            f"cd {backend_dir} && pytest tests/ -v -k 'not integration'",
            "Unit tests only"
        ),
        "3": (
            f"cd {backend_dir} && pytest tests/test_youtube.py -v",
            "YouTube tests"
        ),
        "4": (
            f"cd {backend_dir} && pytest tests/test_schemas.py -v",
            "Schema tests"
        ),
        "5": (
            f"cd {backend_dir} && pytest tests/test_api.py -v",
            "API tests"
        ),
        "6": (
            f"cd {backend_dir} && pytest tests/test_model.py -v",
            "Model tests"
        ),
        "7": (
            f"cd {backend_dir} && pytest tests/ -v --tb=short",
            "Quick tests without coverage"
        ),
        "8": (
            f"cd {backend_dir} && pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing",
            "Full test report with HTML"
        ),
    }

    if choice in commands:
        cmd, desc = commands[choice]
    else:
        cmd = f"cd {backend_dir} && pytest tests/ -v --cov=app --cov-report=term-missing"
        desc = "All tests with coverage (default)"

    success = run_command(cmd, desc)

    if success:
        print("\n" + "="*60)
        print("✓ Tests passed!")
        print("="*60)
        
        if choice == "8":
            print("\nHTML coverage report generated at: backend/htmlcov/index.html")
            print("Open it in a browser to see detailed coverage information")
    else:
        print("\n" + "="*60)
        print("✗ Tests failed!")
        print("="*60)
        sys.exit(1)


if __name__ == "__main__":
    main()
