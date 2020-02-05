#!/bin/bash

function validate_app {
  APPNAME=$1
  CHECK_APP=$( which $APPNAME )
  if [ -z "$CHECK_APP" ]
  then
    echo "Please install $APPNAME"
    exit 1
  fi
}

validate_app git
validate_app mvn
validate_app docker

COMMAND=$0
echo "$COMMAND"
suffix="/build.sh";
HOME_DIR=${COMMAND%$suffix};
pushd $HOME_DIR

rm -rf target

echo "Cloning Conjur Java SDK repository from GIT"

git clone https://github.com/cyberark/conjur-api-java.git

if [ ! -d "./conjur-api-java" ]
then
  echo "Git clone failed"
  exit 1
fi

pushd conjur-api-java

BRANCH_NAME=$( git branch | grep "*" | awk '{print $2}' )

git checkout -b $BRANCH_NAME

echo "Building Conjur Java SDK JAR"

mvn install -DskipTests -Dmaven.javadoc.skip=true

popd

if [ ! -f "conjur-api-java/target/conjur-api-2.1.0-with-dependencies.jar" ]
then
  echo "Maven install Conjur Java SDK jar failed"
  exit 1
fi

echo "Installing Conjur Java SDK JAR to Maven Repo"

mvn install:install-file -Dfile=conjur-api-java/target/conjur-api-2.1.0-with-dependencies.jar -DgroupId=net.conjur.api -DartifactId=conjur-api -Dversion=2.1.0 -Dpackaging=jar

echo "Build Conjur Java Client Example"
mvn install

cp conjur-api-java/target/conjur-api-2.1.0-with-dependencies.jar .

rm -rf conjur-api-java

echo "Creating docker image of Conjur Java Client Example"
docker build -f Dockerfile -t conjur-java-client .

docker images | grep conjur-java-client

