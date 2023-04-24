FROM golang:alpine as builder

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
