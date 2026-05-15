FROM nginx

# Security patches
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
      gpgv \
      openssl \
      libssl3 && \
    rm -rf /var/lib/apt/lists/*

RUN apt-get update -y && \
    apt-get install -y \
      openssl \
      jq \
      curl

ADD request_certificate /server/request_certificate
ADD nginx.conf /etc/nginx/conf.d/server.conf