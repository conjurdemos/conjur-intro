FROM golang:1.19-alpine AS builder
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

# Install k6 with influxdb output plugin
# This plugin introduces support for influxdb v2 output, and is not a part of
# k6 by default due to introducing breaking changes to the core product.
# See: https://github.com/grafana/xk6-output-influxdb
RUN go install go.k6.io/xk6/cmd/xk6@latest
RUN xk6 build --with github.com/grafana/xk6-output-influxdb

FROM alpine:latest

# Install dependencies
RUN apk update && apk add bash \
  curl

COPY --from=builder /src/k6 /usr/local/bin

# Run k6
ENTRYPOINT ["k6"]
