FROM ubuntu

RUN apt-get update -y && \
    apt-get install -y \
      openssl \
      jq \
      curl

ADD request_certificate /client/request_certificate