FROM golang:1.24-alpine AS builder
WORKDIR /src

# On CyberArk dev laptops, internet connections route through
# a corporate proxy. For these connections to succeed we need
# to configure the proxy CA certificate in the container image.
#
# To also allow this script to work on non-CyberArk laptops
# we copy the certificate into the Docker image as a (potentially
# empty) directory, rather than rely on the CA file itself.
COPY ./bin/build_ca_certificate /usr/local/share/ca-certificates/
RUN update-ca-certificates

RUN apk update && apk add git

# Install k6 with statsd output plugin
# This plugin introduces support for statsd output, and is not a part of
# k6 by default due to introducing breaking changes to the core product.
# See: https://github.com/grafana/xk6-output-statsd
RUN go install go.k6.io/xk6/cmd/xk6@latest
RUN xk6 build \
    --with github.com/LeonAdato/xk6-output-statsd \
    --with github.com/grafana/xk6-exec@latest

# Install Conjur CLI
RUN wget https://github.com/cyberark/conjur-cli-go/releases/download/v8.1.2/conjur_linux_amd64 && \
  mv conjur_linux_amd64 conjur && \
  chmod +x conjur

FROM alpine:latest

RUN apk update && apk add gcompat \
    bash \
    curl

COPY --from=builder /src/k6 /usr/local/bin
COPY --from=builder /src/conjur /usr/local/bin

# Run k6
ENTRYPOINT ["k6"]
