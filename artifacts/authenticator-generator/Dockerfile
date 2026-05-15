FROM python:3-slim-bookworm

# Security patches
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
      gpgv \
      openssl \
      libssl3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /authenticator-generator

COPY . /authenticator-generator

RUN pip install --no-cache-dir jinja2
