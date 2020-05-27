#!/bin/bash

#set -x
set -e

PROJECT_NAME=
ACCOUNT_NAME=
AUTHENTICATOR=

function validate_app {
  APPNAME=$1
  CHECK_APP=$( which $APPNAME )
  if [ -z "$CHECK_APP" ]
  then
    echo "Please install $APPNAME"
    exit 1
  fi
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

function validate {
  validate_app helm
  validate_app kubectl
  validate_app docker
  validate_app docker-compose
  validate_app awk
  validate_app openssl
  validate_app keytool
}

function install {
  echo "Creating project $PROJECT_NAME"
  kubectl create namespace $PROJECT_NAME
  kubectl config set-context $(kubectl config current-context) --namespace=$PROJECT_NAME

  DATA_KEY=$( docker-compose run --no-deps --rm conjur data-key generate )

  echo "Installing Conjur OSS application on  Kubernetes"
  kubectl delete ClusterRole conjur-oss-conjur-authenticator --ignore-not-found
  kubectl delete ClusterRoleBinding conjur-oss-conjur-authenticator --ignore-not-found

  cat templates/custom-values.yaml | sed s/'{{ AUTHENTICATOR }}'/$AUTHENTICATOR/g | sed s/'{{ ACCOUNT_NAME }}'/$ACCOUNT_NAME/g  > custom-values.yaml.tmp

  cat custom-values.yaml.tmp | awk "{gsub(/{{ DATA_KEY }}/,\"$DATA_KEY\")}1" > custom-values.yaml
  rm -rf custom-values.yaml.tmp

  echo "Installing conjur-oss"

  helm install --namespace $PROJECT_NAME conjur-oss -f custom-values.yaml https://github.com/cyberark/conjur-oss-helm-chart/releases/download/v1.3.8/conjur-oss-1.3.8.tgz &> /dev/null
  echo "Installation done"

  CONJUR_OSS_POD_LINE=$( kubectl get pods | grep conjur-oss | (head -n1 && tail -n1) )

  CONJUR_OSS_POD=$( echo "$CONJUR_OSS_POD_LINE" | awk '{print $1}' )

  for i in {1..50}
  do
    CONTAINERS_STATUS=$(  kubectl get pods | grep conjur-oss | (head -n1 && tail -n1) | awk '{print $2}' )

    if [ "$CONTAINERS_STATUS" == "2/2" ]; then
      break
    fi
    echo "Waiting for conjur pod to be up..."
    sleep 2
  done

  kubectl get pods

  if [ "$CONTAINERS_STATUS" != "2/2" ]; then
    echo "Conjur pod did not come up properly - exiting"
    exit 1
  fi

  echo "Create account"
  CONJUR_OUTPUT_INIT=$( kubectl exec "$CONJUR_OSS_POD" --container=conjur-oss conjurctl account create $ACCOUNT_NAME )
  API_KEY=$( echo "$CONJUR_OUTPUT_INIT" |  grep "API key" | awk '{print $5}' )

  echo "Create CLI pod"
  kubectl create -f conjur-cli.yaml

  for i in {1..50}
  do
    CONTAINERS_STATUS=$(  kubectl get pods | grep conjur-oss | (head -n1 && tail -n1) | awk '{print $2}' )

    if [ "$CONTAINERS_STATUS" == "1/1" ]; then
      break
    fi
    echo "Waiting for Cli pod to be up..."
    sleep 2
  done

  kubectl get pods

  if [ "$CONTAINERS_STATUS" != "1/1" ]; then
    echo "Cli pod did not come up properly - exiting"
    exit 1
  fi
}

function config {

  echo "Creating basic configuration to Conjur"
  CONJUR_CLI_POD=$( kubectl get pods | grep conjur-cli | (head -n1 && tail -n1) | cut -f 1 -d " " )

  mkdir -p policy

  echo -e "admin\n$API_KEY" > policy/authnInput

  cat templates/policy-hosts-to-authenticate.yaml | sed s/'{{ AUTHENTICATOR }}'/$AUTHENTICATOR/g | sed s/'{{ PROJECT_NAME }}'/$PROJECT_NAME/g > policy/policy-hosts-to-authenticate.yaml

  cat templates/policy-for-webservice.yaml | sed s/'{{ AUTHENTICATOR }}'/$AUTHENTICATOR/g > policy/policy-for-webservice.yaml

  cat templates/policy-for-variables.yaml | sed s/'{{ AUTHENTICATOR }}'/$AUTHENTICATOR/g | sed s/'{{ PROJECT_NAME }}'/$PROJECT_NAME/g > policy/policy-for-variables.yaml

  echo "Load conjur policy"
  docker ps
  kubectl get pods

  kubectl cp policy "$CONJUR_CLI_POD":/
  kubectl cp conjur_scripts "$CONJUR_CLI_POD":/

    kubectl exec -it "$CONJUR_CLI_POD" conjur init <<< "https://conjur-oss
yes
$ACCOUNT_NAME
y
"
    kubectl exec -it "$CONJUR_CLI_POD" conjur authn login < policy/authnInput

    kubectl exec -it "$CONJUR_CLI_POD" conjur policy load root policy/policy-hosts-to-authenticate.yaml
    kubectl exec -it "$CONJUR_CLI_POD" conjur policy load root policy/policy-for-webservice.yaml
    kubectl exec -it "$CONJUR_CLI_POD" conjur policy load root policy/policy-for-variables.yaml
    kubectl exec -it "$CONJUR_CLI_POD" conjur variable values add variables/mypassword 123

  echo "Create certificate"
  kubectl exec -it "$CONJUR_CLI_POD" ./conjur_scripts/cert_script.sh $ACCOUNT_NAME $AUTHENTICATOR
  kubectl exec -it "$CONJUR_CLI_POD" cat /root/conjur-$ACCOUNT_NAME.pem > conjur-cert.pem
  kubectl delete --ignore-not-found=true configmap conjur-cert
  ssl_certificate=$(cat conjur-cert.pem )
  kubectl create configmap conjur-cert --from-literal=ssl-certificate="$ssl_certificate"

  kubectl delete --ignore-not-found=true configmap conjur-cert-java
  kubectl create configmap conjur-cert-java --from-file=ssl-certificate=conjur-cert.pem
}

usage()
{
  cat << EOF

    Installs Conjur with Conjut CLI on  Kubernetes

    Usage: installer.sh [options]

      -h, --help                      Shows this help message
      --project-name <project>        Kubernetes project name (mandatory)
      --account-name <account>        Conjur account name (mandatory)
      --authenticator <authenticator> Conjur authenticator (mandatory)
EOF
}

while [ "$1" != "" ]; do
  case $1 in
    --project-name )    shift
                        PROJECT_NAME=$1
                        ;;
    --account-name )	  shift
                        ACCOUNT_NAME=$1
                        ;;
    --authenticator )   shift
                        AUTHENTICATOR=$1
                        ;;
    -h | --help )       usage
                        exit
                        ;;
    * )                 usage
			exit 1
  esac
  shift
done

validate

PROJECT_NAME=$(prepare_input "$PROJECT_NAME" "project name")
ACCOUNT_NAME=$(prepare_input "$ACCOUNT_NAME" "account name" "default")
AUTHENTICATOR=$(prepare_input "$AUTHENTICATOR" "authenticator")

install

config

#rm -rf conjur-cert.crt
#rm -rf conjur-cert.pem
rm -rf custom-values.yaml
rm -rf policy

echo "Installation done"
