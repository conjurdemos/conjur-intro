FROM maven:3-amazoncorretto-19-debian
MAINTAINER Cyberark Inc.

ADD . .

RUN mvn install

ENTRYPOINT ["java", "-jar", "ConjurJavaClient-1.0-SNAPSHOT-with-dependencies.jar"]

