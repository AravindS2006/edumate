FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY main.py .
COPY crypto_utils.py .
COPY sheets_logger.py .

# Prevent memory fragmentation on glibc systems (especially crucial for 512MB limits on Render)
ENV MALLOC_ARENA_MAX=2

# Expose port (Render uses $PORT env var)
EXPOSE 8000

# Run with uvicorn — Render injects PORT env var
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
