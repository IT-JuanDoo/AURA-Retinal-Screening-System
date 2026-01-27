# =============================================================================
# AURA AI Core Microservice - Dockerfile
# Python FastAPI service for retinal image analysis
# Model: tomalmog/oct-retinal-classifier (EfficientNet-B3, 99.6% accuracy)
# =============================================================================

# Stage 1: Base image with Python
FROM python:3.11-slim AS base

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=0 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    # Hugging Face cache directory
    HF_HOME=/app/.cache/huggingface \
    # Model will be downloaded on first use
    MODEL_VERSION=v2.0.0

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# =============================================================================
# Stage 2: Dependencies
# =============================================================================
FROM base AS dependencies

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
# Note: PyTorch CPU version is used by default for smaller image size
# For GPU support, use pytorch/pytorch base image instead
RUN pip install --upgrade pip && \
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install -r requirements.txt

# =============================================================================
# Stage 3: Production
# =============================================================================
FROM base AS production

# Create non-root user for security
# Tạo sẵn các thư mục cần thiết cho explainability images
RUN useradd --create-home --shell /bin/bash appuser && \
    mkdir -p /app/.cache/huggingface && \
    mkdir -p /app/heatmaps && \
    mkdir -p /app/annotated-images && \
    chown -R appuser:appuser /app

# Copy installed dependencies from dependencies stage
COPY --from=dependencies /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=dependencies /usr/local/bin /usr/local/bin

# Copy application code
COPY app/ ./app/

# Set ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check (increased start period for model download)
HEALTHCHECK --interval=30s --timeout=30s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Environment variables
ENV PORT=8000 \
    HOST=0.0.0.0 \
    PYTHONPATH=/app \
    HF_HOME=/app/.cache/huggingface \
    MODEL_VERSION=v2.0.0

# Run the application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

