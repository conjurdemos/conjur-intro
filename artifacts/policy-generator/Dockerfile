FROM python:3-slim-bookworm

# Security patches
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
      gpgv \
      libgnutls30 \
      libpam-modules \
      openssl \
      libssl3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /policy-generator

COPY . /policy-generator

RUN pip install --no-cache-dir jinja2
