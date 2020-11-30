FROM golang:1.14.1-alpine3.11 as builder

WORKDIR /workdir
RUN rm -rf cfssl

RUN set -x && \
	apk --no-cache add git gcc libc-dev make

RUN git clone https://github.com/cloudflare/cfssl.git && \
    cd cfssl && make

# FROM alpine:3.11
FROM ruby:2.7-alpine
COPY --from=builder /workdir/cfssl /etc/cfssl
COPY --from=builder /workdir/cfssl/bin/ /usr/bin

RUN set -x && \
	apk --no-cache add postgresql-client

# RUN echo "12.16.23.20 database-1.staging.mycompany.com" >> /etc/hosts
# RUN echo "12.16.23.22 cfssl" >> /etc/hosts
