#!/bin/bash

set -e
#set -x

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
rm -rf conjur-api-java

echo "Cloning Conjur Java SDK repository from Github"

git clone https://github.com/cyberark/conjur-api-java.git

if [ ! -d "./conjur-api-java" ]
then
  echo "Git clone failed"
  exit 1
fi

BRANCH_NAME=$( git rev-parse --abbrev-ref HEAD )

git checkout $BRANCH_NAME

pushd conjur-api-java

echo "Building Conjur Java SDK JAR"

mvn install -DskipTests -Dmaven.javadoc.skip=true

popd

API_JAR_NAME=$( ls conjur-api-java/target/*with-dependencies.jar | grep conjur-api )
echo "API_JAR_NAME=$API_JAR_NAME"
if [ -z $API_JAR_NAME ]
then
  echo "Maven install Conjur Java SDK jar failed"
  exit 1
fi

VERSION=$( echo "$API_JAR_NAME"| cut -d'/' -f 3 | cut -d'-' -f 3 )

echo "Installing Conjur Java SDK JAR to Maven Repo"

mvn install:install-file -Dfile=conjur-api-java/target/conjur-api-$VERSION-with-dependencies.jar -DgroupId=net.conjur.api -DartifactId=conjur-api -Dversion=$VERSION -Dpackaging=jar

echo "Build Conjur Java Client Example"
mvn install -Dconjur-api-version=2.1.0

cp conjur-api-java/target/conjur-api-2.1.0-with-dependencies.jar .

rm -rf conjur-api-java

echo "Creating docker image of Conjur Java Client Example"
docker build -f Dockerfile -t conjur-java-client .

docker images | grep conjur-java-client

