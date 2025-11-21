FROM python:3.12-slim

# Prevents Python from writing .pyc files and ensures stdout/stderr are unbuffered
ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	PIP_DISABLE_PIP_VERSION_CHECK=1 \
	PORT=5000 \
	PYTHONPATH=/app

WORKDIR /app

# System deps (build essentials for any wheels that need compiling)
RUN apt-get update && apt-get install -y --no-install-recommends \
	build-essential \
	&& rm -rf /var/lib/apt/lists/*

# Install Python dependencies first for better layer caching
COPY requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend code
COPY . /app/backend

EXPOSE 5000

# Default command: run the Flask app via Gunicorn using the factory
# The module path assumes code is under /app/backend
# Use sh -c exec form so $PORT expands and factory function syntax is preserved
CMD ["sh", "-c", "gunicorn -b 0.0.0.0:$PORT backend.wsgi:app"]
