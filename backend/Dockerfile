FROM python:3.9

WORKDIR /app

# 시스템 패키지 업데이트 및 빌드 도구 설치
RUN apt-get update && \
    apt-get install -y build-essential

# MAFFT 설치
COPY ./app/lib/mafft-7.487-without-extensions-src.tgz .
RUN tar xvzf mafft-7.487-without-extensions-src.tgz && \
    cd mafft-7.487-without-extensions/core && \
    make clean && \
    make && \
    make install && \
    cd ../.. && \
    rm -rf mafft-7.487-without-extensions* && \
    apt-get remove -y build-essential && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# UCLUST 바이너리 복사 및 실행 권한 부여
COPY ./app/lib/uclust /usr/local/bin/
RUN chmod +x /usr/local/bin/uclust

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY ./app /app

ENV PYTHONPATH=/app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] 