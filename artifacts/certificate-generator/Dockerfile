FROM golang:1.27-alpine as builder

RUN set -x && \
	apk --no-cache add gcc libc-dev

RUN go install github.com/cloudflare/cfssl/cmd/...@latest

FROM alpine:3.14
COPY --from=builder /go/bin/ /usr/bin

RUN mkdir -p /src
COPY . /src
WORKDIR /src

ENTRYPOINT [ "/src/generate-certs-script" ]
