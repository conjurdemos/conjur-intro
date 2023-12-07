FROM maven:3.9.5-amazoncoretto-21
MAINTAINER Cyberark Inc.

ADD . .

RUN mvn install

ENTRYPOINT ["java", "-jar", "ConjurJavaClient-1.0-SNAPSHOT-with-dependencies.jar"]

