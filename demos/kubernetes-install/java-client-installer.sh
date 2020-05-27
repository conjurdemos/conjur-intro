#!/bin/bash

set -x
set -e

PROJECT_NAME=
ACCOUNT_NAME=
AUTHENTICATOR=
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
  validate_app kubectl
  validate_app docker
  validate_app docker-compose
  validate_app awk
  validate_app openssl
  validate_app keytool
}

function prepare_input {

  local PARAM_VALUE=$1
  local PARAM_NAME=$2
  local DEFAULT_VALUE=$3

  if [ "$PARAM_VALUE" == "" ]; then
    if [ -n "$DEFAULT_VALUE" ]; then
      read -p "Please specify the $PARAM_NAME [$DEFAULT_VALUE]:" PARAM_VALUE
    else
      read -p "Please specify the $PARAM_NAME:" PARAM_VALUE
    fi
    if [ "$PARAM_VALUE" == "" ]; then
      if [ -n "$DEFAULT_VALUE" ]; then
        PARAM_VALUE=$DEFAULT_VALUE
      else
        echo "Missing value in $PARAM_NAME - exiting"
        exit 1
      fi
    fi
  fi

  echo "$PARAM_VALUE"

}


function install {

  echo "entering project $PROJECT_NAME"
  # kubens $PROJECT_NAME
  kubectl config set-context $(kubectl config current-context) --namespace=$PROJECT_NAME
  echo "Pods originally running:"
  kubectl get pods

  echo "Tagging java client docker image"
  docker tag conjur-java-client:latest $PROJECT_NAME/conjur-java-client:latest

  echo "Running Conjur Java Client in  Kubernetes"
  cat templates/conjur-java-api-example.yaml | sed s/'{{ AUTHENTICATOR }}'/$AUTHENTICATOR/g | sed s/'{{ ACCOUNT_NAME }}'/$ACCOUNT_NAME/g | sed s/'{{ DEPLOYMENT_NAME }}'/$DEPLOYMENT_NAME/g | sed s/'{{ PROJECT_NAME }}'/$PROJECT_NAME/g > conjur-java-api-example.yaml
  kubectl create -f conjur-java-api-example.yaml

}

usage()
{
    echo "usage: installer [--project-name project] [--account-name account] [--authenticator authenticator]] | [-h]]"

cat << EOF

    Installs Conjur with Conjut CLI on  Kubernetes

    Usage: installer.sh [options]

      -h, --help                      Shows this help message
      -- kube-url <url>                  Kubernetes URL (mandatory)
      --project-name <project>         Kubernetes project name (mandatory)
      --account-name <account>        Conjur account name (mandatory)
      --authenticator <authenticator> Conjur authenticator (mandatory)
EOF
}

DO_CONFIG=0
while [ "$1" != "" ]; do
  case $1 in
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

validate

PROJECT_NAME=$(prepare_input "$PROJECT_NAME" "project name")
ACCOUNT_NAME=$(prepare_input "$ACCOUNT_NAME" "account name" "default")
AUTHENTICATOR=$(prepare_input "$AUTHENTICATOR" "authenticator")

./installer.sh --project-name "$PROJECT_NAME" --account-name "$ACCOUNT_NAME" --authenticator "$AUTHENTICATOR"

install

CONJUR_JAVA_API_POD_LINE=$( kubectl get pods | grep conjur-java-api-example | (head -n1 && tail -n1) )

CONJUR_JAVA_API_POD=$( echo "$CONJUR_JAVA_API_POD_LINE" | awk '{print $1}' )

for i in {1..50}
do
  CONTAINERS_STATUS=$(  kubectl get pods | grep conjur-java-api-example | (head -n1 && tail -n1) | awk '{print $2}' )
  if [ "$CONTAINERS_STATUS" == "2/2" ]; then
    break
  fi
  echo "Waiting for the Java client pod to start..."
  sleep 2
done

kubectl get pods

rm -rf conjur-java-api-example.yaml

echo "Installation done"

sleep 10
kubectl logs $CONJUR_JAVA_API_POD -c my-conjur-java-client
