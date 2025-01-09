FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    postgresql-client \
    curl && \
    rm -rf /var/lib/apt/lists/*

# Install MAFFT
COPY ./app/lib/mafft-7.487-without-extensions-src.tgz .
RUN tar xvzf mafft-7.487-without-extensions-src.tgz && \
    cd mafft-7.487-without-extensions/core && \
    make clean && make && make install && \
    cd ../.. && rm -rf mafft-7.487-without-extensions*

# Copy UCLUST binary
COPY ./app/lib/uclust /usr/local/bin/
RUN chmod +x /usr/local/bin/uclust

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app

ENV PYTHONPATH=/app

# 직접 FastAPI 실행
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] 