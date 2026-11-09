FROM python:3.12-slim-bookworm@sha256:935c3c5b12357a7e10caa9c1e6ca5692344d97cf229832ef584be2cec9fc03df

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    U2NET_HOME=/data/photo-tools/models OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 closetlint \
    && useradd --uid 10001 --gid closetlint --no-create-home closetlint \
    && install -d -m 0700 -o closetlint -g closetlint /data

WORKDIR /opt/closetlint
COPY deploy/docker/requirements.txt /tmp/photo-requirements.txt
RUN python -m pip install --no-cache-dir --only-binary=:all: -r /tmp/photo-requirements.txt \
    && rm /tmp/photo-requirements.txt
COPY app/ app/
COPY runtime/ runtime/
COPY tools/ tools/
COPY deploy/docker/start.py deploy/docker/health.py deploy/docker/
COPY LICENSE NOTICE README.md package.json ./

LABEL org.opencontainers.image.title="Closet Lint" \
      org.opencontainers.image.source="https://github.com/stephthegeek/closetlint" \
      org.opencontainers.image.licenses="GPL-3.0-or-later"
USER 10001:10001
VOLUME ["/data"]
EXPOSE 6684
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD ["python", "deploy/docker/health.py"]
ENTRYPOINT ["python", "deploy/docker/start.py"]
