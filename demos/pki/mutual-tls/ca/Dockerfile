FROM ubuntu

RUN apt-get update -y && \
    apt-get install -y openssl

RUN mkdir -p /root
WORKDIR /root

COPY generate_ca generate_ca

CMD [ "/root/generate_ca" ]
