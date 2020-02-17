#!/bin/bash

#set -x
set -e

OPENSHIFT_URL=
PROJECT_NAME=
ACCOUNT_NAME=myaccount
AUTHENTICATOR=myauthenticator
DEPLOYMENT_NAME=conjur-java-api-example

function validate_app {
  APPNAME=$1
  CHECK_APP=$( which $APPNAME )
  if [ -z "$CHECK_APP" ]
  then
    echo "Please install $APPNAME"
    exit 1
  fi
}

function validate {
  validate_app helm
  validate_app oc
  validate_app docker
  validate_app docker-compose
  validate_app awk
  validate_app openssl
  validate_app keytool
}

function install {

  echo "entering project $PROJECT_NAME"
  oc project $PROJECT_NAME

  echo "Pods originally running:"
  oc get pods

  TOKEN=$( oc whoami -t )
	
  echo "Pushing java client docker image to openshift"
  docker tag conjur-java-client:latest $DOCKER_URL/$PROJECT_NAME/conjur-java-client:latest
  docker login $DOCKER_URL -u _ -p $TOKEN
  docker push $DOCKER_URL/$PROJECT_NAME/conjur-java-client:latest

  oc get is
	
  echo "Running Conjur Java Client in OpenShift"
  cat templates/conjur-java-api-example.yaml | sed s/'{{ AUTHENTICATOR }}'/$AUTHENTICATOR/g | sed s/'{{ ACCOUNT_NAME }}'/$ACCOUNT_NAME/g | sed s/'{{ DEPLOYMENT_NAME }}'/$DEPLOYMENT_NAME/g | sed s/'{{ PROJECT_NAME }}'/$PROJECT_NAME/g > conjur-java-api-example.yaml
  oc create -f conjur-java-api-example.yaml

}

usage()
{
    echo "usage: installer [[[--ocp-url url ] [--docker-url url ] [--project-name project] [--account-name account] [--authenticator authenticator]] | [-h]]"

cat << EOF

    Installs Conjur with Conjut CLI on OpenShift

    Usage: installer.sh [options]

      -h, --help                      Shows this help message
      --ocp-url <url>                 OpenShift URL (mandatory)
      --docker-url <url>              Docker URL (mandatory)
      --project-name <project>        OpenShift project name (mandatory)
      --account-name <account>        Conjur account name (mandatory)
      --authenticator <authenticator> Conjur authenticator (mandatory)
EOF
}

DO_CONFIG=0
while [ "$1" != "" ]; do
  case $1 in 
    --ocp-url )	shift
                OPENSHIFT_URL=$1
                ;;
    --docker-url ) shift
                   DOCKER_URL=$1
                   ;;
    --project-name ) shift
                     PROJECT_NAME=$1
                     ;;
    --account-name )	shift
                        ACCOUNT_NAME=$1
                        ;;
    --authenticator ) shift
                      AUTHENTICATOR=$1
                      ;;
    -h | --help ) usage
                  exit
                  ;;
    * )	usage
        exit 1
  esac
  shift
done

if [ "$OPENSHIFT_URL" == "" ]; then
  echo "Missing value in --ocp-url - exiting"
  exit 1
fi

if [ "$PROJECT_NAME" == "" ]; then
  echo "Missing value in --project-name - exiting"
  exit 1
fi

validate

install

CONJUR_JAVA_API_POD_LINE=$( oc get pods | grep conjur-java-api-example | (head -n1 && tail -n1) )

CONJUR_JAVA_API_POD=$( echo "$CONJUR_JAVA_API_POD_LINE" | awk '{print $1}' )

for i in {1..50}
do
  CONTAINERS_STATUS=$(  oc get pods | grep conjur-java-api-example | (head -n1 && tail -n1) | awk '{print $2}' )

  if [ "$CONTAINERS_STATUS" == "2/2" ]; then
    break
  fi
  echo "Waiting for the Java client pod to start..."
  sleep 2
done

oc get pods

rm -rf conjur-java-api-example.yaml

echo "Installation done"


