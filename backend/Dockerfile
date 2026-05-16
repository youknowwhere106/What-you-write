FROM python:3.11-slim

WORKDIR /app

# Install system deps for sentence-transformers / PyTorch CPU
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install PyTorch CPU-only first (avoids pulling CUDA wheels)
RUN pip install --no-cache-dir torch --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/worker_start.sh

# Pre-download the sentence-transformers model into the image so there is
# zero HuggingFace download delay at container startup.
# The model path is baked into the layer cache.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

EXPOSE 8000

# Use exec form with shell expansion for Railway's dynamic $PORT.
# Railway always sets PORT; the fallback 8000 covers local Docker runs.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
