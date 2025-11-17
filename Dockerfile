FROM node:20-bookworm

# Install Python for the backend
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     python3 python3-venv python3-pip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Pre-install backend deps to leverage layer caching
COPY backend/requirements.txt backend/requirements.txt
RUN python3 -m venv .venv \
  && . .venv/bin/activate \
  && pip install --upgrade pip \
  && pip install -r backend/requirements.txt

# Copy full repo
COPY . .

# Build frontend
RUN cd frontend \
  && npm install --no-audit --no-fund \
  && npm run build

ENV HOST=0.0.0.0 \
  PORT=8080 \
    PIM_DATA_DIR=/data

RUN mkdir -p /data

EXPOSE 8080

# Start both backend and frontend; /api is proxied to 127.0.0.1:5000 via next.config.js
CMD ["bash", "./start.sh"]
