# Testing Guide - YouTube Sentiment Analysis Project

This document provides a comprehensive guide for running and writing tests in this project.

## Project Testing Structure

### Backend Tests (Python/FastAPI)

Located in: `backend/tests/`

**Test Files:**

- `test_main.py` - Health endpoint and app initialization tests
- `test_youtube.py` - YouTube video ID extraction and URL parsing tests
- `test_schemas.py` - Pydantic schema validation tests
- `test_model.py` - Sentiment model inference tests
- `test_api.py` - FastAPI endpoint tests
- `test_utils.py` - Utility function tests
- `conftest.py` - Pytest fixtures and configuration

**Test Categories:**

- **Unit Tests**: Test individual functions and classes in isolation
- **Integration Tests**: Test how components work together
- **API Tests**: Test HTTP endpoints

### Frontend Tests (React/Vite)

Located in: `frontend/tests/`

**Test Files:**

- `App.submit-flow.test.tsx` - Main app flow tests
- `RootApp.auth-history.test.tsx` - Auth and history tests
- `youtube.validation.test.ts` - YouTube URL validation tests
- `e2e-browser-submit.mjs` - End-to-end browser tests
- `setup.ts` - Test environment setup

## Running Tests

### Backend Tests

#### Prerequisites

```bash
# Install dependencies
pip install -r requirements.txt
```

#### Run All Backend Tests

```bash
# From the root directory
pytest backend/tests/ -v

# Or from the backend directory
cd backend
pytest tests/ -v
```

#### Run Specific Test File

```bash
pytest backend/tests/test_youtube.py -v
```

#### Run Specific Test Class

```bash
pytest backend/tests/test_youtube.py::TestExtractVideoId -v
```

#### Run Specific Test Function

```bash
pytest backend/tests/test_youtube.py::TestExtractVideoId::test_extract_video_id_standard_youtube_url -v
```

#### Run Tests with Coverage Report

```bash
pytest backend/tests/ --cov=app --cov-report=html --cov-report=term-missing
```

The HTML coverage report will be generated in `htmlcov/index.html`

#### Run Tests Matching Pattern

```bash
# Run all YouTube-related tests
pytest backend/tests/ -k youtube -v

# Run all schema tests
pytest backend/tests/ -k schema -v
```

#### Run Tests with Detailed Output

```bash
pytest backend/tests/ -vv --tb=long
```

### Frontend Tests

#### Install Dependencies

```bash
cd frontend
npm install
```

#### Run All Frontend Tests

```bash
npm test
```

#### Run Specific Test File

```bash
npm test -- App.submit-flow.test.tsx
```

#### Run Tests in Watch Mode

```bash
npm test -- --watch
```

#### Run End-to-End Tests

```bash
npm run test:e2e
```

## Test Coverage Goals

| Component             | Target Coverage |
| --------------------- | --------------- |
| Backend API endpoints | 90%+            |
| YouTube functions     | 95%+            |
| Schema validation     | 90%+            |
| Model inference       | 80%+            |
| Utilities             | 85%+            |
| Frontend components   | 80%+            |

## Writing New Tests

### Backend Test Template

```python
"""Tests for [component name]."""

from __future__ import annotations

import pytest

class Test[ComponentName]:
    """Test suite for [component]."""

    def test_valid_behavior(self):
        """Test that [component] works correctly."""
        # Arrange
        input_data = "test"

        # Act
        result = function_under_test(input_data)

        # Assert
        assert result is not None
        assert result == expected_value

    def test_error_handling(self):
        """Test error handling."""
        with pytest.raises(ValueError):
            function_under_test(invalid_input)
```

### Key Testing Principles

1. **Arrange-Act-Assert Pattern**
   - Clearly separate test setup, execution, and verification

2. **One Assertion Per Test**
   - Keep tests focused on a single behavior
   - Makes it easier to identify failures

3. **Use Descriptive Names**
   - Test name should clearly describe what is being tested
   - Format: `test_<what>_<when>_<expected_result>`

4. **Mock External Dependencies**
   - Use mock objects for API calls, database, etc.
   - Avoid actual network/database calls in tests

5. **Test Edge Cases**
   - Empty inputs
   - Invalid inputs
   - Boundary values
   - Error conditions

## Debugging Tests

### Run Test with Print Output

```bash
pytest backend/tests/test_youtube.py -v -s
# The -s flag prevents output capture
```

### Run Test with PDB (Python Debugger)

```bash
pytest backend/tests/test_youtube.py -v --pdb
```

### Run Test with Verbose Traceback

```bash
pytest backend/tests/test_youtube.py -v --tb=long
```

## Test Fixtures

Common fixtures defined in `conftest.py`:

- `app` - FastAPI test application
- `client` - TestClient for making HTTP requests
- `mock_model_service` - Mocked sentiment model
- `sample_comments` - Sample YouTube comments
- `sample_predictions` - Sample model predictions
- `mock_youtube_comments` - Mock YouTube API responses

## CI/CD Integration

### Before Committing

```bash
# Run all tests with coverage
pytest backend/tests/ --cov=app --cov-fail-under=70

# If tests pass, commit changes
git add .
git commit -m "Add feature with tests"
```

### GitHub Actions

Tests should be automatically run on:

- Pull requests
- Pushes to main branch
- Before deployment

## Troubleshooting

### Issue: Tests fail with "Model is not loaded"

**Solution**: Mock the model service or ensure fixtures are properly applied

### Issue: Async tests timeout

**Solution**: Increase timeout or check for infinite loops in async code

### Issue: Import errors in tests

**Solution**: Ensure PYTHONPATH includes the backend directory

### Issue: Database-related test failures

**Solution**: Use test database fixtures and cleanup after each test

## Running Tests Locally Before Pushing

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run all tests
pytest backend/tests/ -v

# 3. Check coverage
pytest backend/tests/ --cov=app --cov-report=term-missing

# 4. If all pass, push to repository
git push origin <branch-name>
```

## Test Reports

### Generate HTML Coverage Report

```bash
pytest backend/tests/ --cov=app --cov-report=html
# Open htmlcov/index.html in browser
```

### Generate XML Coverage Report

```bash
pytest backend/tests/ --cov=app --cov-report=xml
# For integration with CI/CD tools
```

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Fastapi Testing](https://fastapi.tiangolo.com/advanced/testing-dependencies/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)

---

**Last Updated**: April 2025
