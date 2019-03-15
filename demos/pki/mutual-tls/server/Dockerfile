FROM nginx

RUN apt-get update -y && \
    apt-get install -y \
      openssl \
      jq \
      curl

ADD request_certificate /server/request_certificate
ADD nginx.conf /etc/nginx/conf.d/server.conf