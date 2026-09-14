# Dockerfile for the STRATUM backend API.
#
# Monorepo structure: Poetry files at the repository root, API code in apps/api/.
# Not used by the documented local setup — the README runs the API with uvicorn —
# but provided for anyone deploying the API as a container.

FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry==1.7.1

# Copy poetry files from root
COPY pyproject.toml poetry.lock ./

# Configure poetry to not create virtual env (we're in a container)
RUN poetry config virtualenvs.create false

# Install dependencies
RUN poetry install --no-dev --no-interaction --no-ansi

# Copy entire project (monorepo structure)
COPY . .

# Set Python path to include project root
ENV PYTHONPATH=/app:$PYTHONPATH

# Expose port (Cloud Run will set PORT env var)
ENV PORT=56300
EXPOSE 56300

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:56300/api/v1/health || exit 1

# Run uvicorn from project root
CMD uvicorn apps.api.main:app --host 0.0.0.0 --port ${PORT}
