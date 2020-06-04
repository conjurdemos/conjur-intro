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

validate_app docker

COMMAND=$0
echo "$COMMAND"
suffix="/build.sh";
HOME_DIR=${COMMAND%$suffix};
pushd $HOME_DIR

echo "Creating docker image of Conjur Java Client Example"
docker build -f Dockerfile --build-arg VERSION=2.2.1 -t conjur-java-client .

docker images | grep conjur-java-client
