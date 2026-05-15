FROM python:3-slim-bookworm

# Security patches
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
      gpgv \
      libc-bin \
      libgnutls30 \
      libk5crypto3 \
      libpam-modules \
      openssh-client \
      openssl \
      libssl3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /policy-generator

COPY . /policy-generator

RUN pip install --no-cache-dir jinja2
