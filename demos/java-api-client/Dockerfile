FROM maven:3-amazoncorretto-8-debian-bookworm
MAINTAINER Cyberark Inc.

# Security patches
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
      gpgv \
      libgnutls30 \
      libpam-modules \
      openssl \
      libssl3 && \
    rm -rf /var/lib/apt/lists/*

ADD . .

RUN mvn install

ENTRYPOINT ["java", "-jar", "ConjurJavaClient-1.0-SNAPSHOT-with-dependencies.jar"]

