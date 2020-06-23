FROM maven:3-openjdk-8
MAINTAINER Cyberark Inc.

ADD . .

RUN mvn install

ENTRYPOINT ["java", "-jar", "ConjurJavaClient-1.0-SNAPSHOT-with-dependencies.jar"]

