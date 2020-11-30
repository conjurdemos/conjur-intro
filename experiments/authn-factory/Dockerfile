FROM ruby:2.7-alpine

RUN apk update
RUN apk update && apk add --virtual build-dependencies build-base git openssl jq curl
RUN rm -rf /var/cache/apk/*

RUN mkdir -p /src/authn-factory
WORKDIR /src/authn-factory
COPY . /src/authn-factory
RUN bundle install
