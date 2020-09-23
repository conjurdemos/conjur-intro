FROM golang:1.14.1-alpine3.11 as builder

WORKDIR /workdir
COPY . /workdir

RUN set -x && \
	apk --no-cache add git gcc libc-dev make

RUN git clone https://github.com/cloudflare/cfssl.git && \
    cd cfssl && make

FROM alpine:3.11
COPY --from=builder /workdir/cfssl /etc/cfssl
COPY --from=builder /workdir/cfssl/bin/ /usr/bin
