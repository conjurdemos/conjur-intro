FROM ubuntu

RUN apt-get update -y && \
    apt-get install -y \
      openssl \
      jq \
      curl

# The 2 lines above prevent the `Can't load /root/.rnd into RNG` error
RUN touch .rnd && chmod 060 .rnd

ADD request_certificate /client/request_certificate
