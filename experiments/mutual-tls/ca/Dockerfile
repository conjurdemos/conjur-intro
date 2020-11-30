FROM golang:1.14.1-alpine3.11 as builder

WORKDIR /workdir
RUN rm -rf cfssl

RUN set -x && \
	apk --no-cache add git gcc libc-dev make

RUN git clone https://github.com/cloudflare/cfssl.git && \
    cd cfssl && make

FROM ruby:2.7-alpine
COPY --from=builder /workdir/cfssl /etc/cfssl
COPY --from=builder /workdir/cfssl/bin/ /usr/bin

RUN apk update
RUN apk update && apk add --virtual build-dependencies build-base git openssl jq curl
RUN rm -rf /var/cache/apk/*

RUN mkdir -p /src/ca
WORKDIR /src/ca
COPY . /src/ca
RUN bundle install
