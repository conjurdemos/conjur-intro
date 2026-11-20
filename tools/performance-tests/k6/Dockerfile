FROM golang:1.27-alpine AS builder
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
#
# xk6-output-statsd is pinned to v0.2.3 because v0.2.5 (2026-08-27) moved to
# the go.k6.io/k6/v2 module path, while xk6-exec is still on the pre-v2
# go.k6.io/k6 path - building both together makes xk6 pick one module major
# for the k6 core, silently breaking whichever extension depends on the
# other. Pinning here keeps both extensions on the compatible pre-v2 path.
#
# xk6, k6 and xk6-exec are pinned too: "latest" resolved k6 to v1.7.1, whose
# dependency set (grpc v1.80.0 with x/net v0.54.0) fails to compile with
# "undefined: http2.TrailerPrefix". Bump these deliberately and rebuild.
RUN go install go.k6.io/xk6/cmd/xk6@v1.5.1
RUN xk6 build --k6-version v1.8.3 \
    --with github.com/LeonAdato/xk6-output-statsd@v0.2.3 \
    --with github.com/grafana/xk6-exec@v0.5.1

# Install Conjur CLI
RUN wget https://github.com/cyberark/conjur-cli-go/releases/download/v8.1.2/conjur_linux_amd64 && \
  mv conjur_linux_amd64 conjur && \
  chmod +x conjur

FROM alpine:latest

RUN apk update && apk add gcompat \
    bash \
    curl \
    nghttp2-libs

COPY --from=builder /src/k6 /usr/local/bin
COPY --from=builder /src/conjur /usr/local/bin

# Run k6
ENTRYPOINT ["k6"]
