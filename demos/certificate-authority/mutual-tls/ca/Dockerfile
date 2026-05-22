FROM ubuntu

# Security patches
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
      sed && \
    rm -rf /var/lib/apt/lists/*

RUN apt-get update -y && \
    apt-get install -y openssl

RUN mkdir -p /root
WORKDIR /tmp/ca

COPY generate_ca generate_ca

CMD [ "/tmp/ca/generate_ca" ]
