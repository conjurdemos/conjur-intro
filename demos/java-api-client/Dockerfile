# =================== BUILD API CONTAINER ===================
FROM maven:3-openjdk-8 as conjur-api-builder
MAINTAINER Cyberark Inc.
LABEL builder="java-api-builder"

RUN git clone https://github.com/cyberark/conjur-api-java.git

WORKDIR conjur-api-java

RUN mvn install -DskipTests -Dmaven.javadoc.skip=true

# =================== MAIN CONTAINER ===================
FROM maven:3-openjdk-8 as java-client
ARG VERSION

ADD . .

COPY --from=conjur-api-builder conjur-api-java/target/conjur-api-"$VERSION"-with-dependencies.jar .

RUN mvn install:install-file \
-Dfile=conjur-api-2.2.1-with-dependencies.jar \
-DgroupId=net.conjur.api -DartifactId=conjur-api -Dversion="$VERSION" \
-Dpackaging=jar

RUN mvn install -Dconjur-api-version="$VERSION"

ENTRYPOINT ["java", "-jar", "target/ConjurJavaClient-1.0-SNAPSHOT-with-dependencies.jar"]
