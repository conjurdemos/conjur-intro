# The pinned golang/alpine verison is to address a build issue here:
# https://github.com/mattn/go-sqlite3/issues/1164
#
# Once the upstream issue is resolved, the base image should be reverted to:
# golang:alpine
FROM golang:1.21.5-alpine3.18 as builder

WORKDIR /workdir
COPY . /workdir

RUN set -x && \
	apk --no-cache add git gcc libc-dev make

RUN git clone https://github.com/cloudflare/cfssl.git && \
    cd cfssl && make

FROM alpine:3.14
COPY --from=builder /workdir/cfssl /etc/cfssl
COPY --from=builder /workdir/cfssl/bin/ /usr/bin

RUN mkdir -p /src
COPY . /src
WORKDIR /src

ENTRYPOINT [ "/src/generate-certs-script" ]
