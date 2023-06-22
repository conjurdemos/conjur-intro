#!/bin/bash

#set -x
set -e

OPENSHIFT_URL=
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
  validate_app oc
  validate_app docker
  validate_app docker-compose
  validate_app awk
  validate_app openssl
  validate_app keytool
}

function install {

  oc login $OPENSHIFT_URL
  #oc adm prune images
  echo "Creating project $PROJECT_NAME"
  
  oc new-project $PROJECT_NAME

  TOKEN=$( oc whoami -t )

  DATA_KEY=$( docker compose run --no-deps --rm conjur data-key generate )

  oc get is
  echo "Installing Conjur OSS application on OpenShift"
  oc delete ClusterRole conjur-oss-conjur-authenticator --ignore-not-found
  oc delete ClusterRoleBinding conjur-oss-conjur-authenticator --ignore-not-found


  cat templates/custom-values.yaml | sed s/'{{ AUTHENTICATOR }}'/$AUTHENTICATOR/g | sed s/'{{ ACCOUNT_NAME }}'/$ACCOUNT_NAME/g  > custom-values.yaml.tmp
  
  cat custom-values.yaml.tmp | awk "{gsub(/{{ DATA_KEY }}/,\"$DATA_KEY\")}1" > custom-values.yaml
  rm -rf custom-values.yaml.tmp
  ##cat custom-values.yaml
  echo "Installing conjur-oss"
  oc adm policy add-scc-to-user anyuid "system:serviceaccount:$PROJECT_NAME:default" &> /dev/null
  helm install conjur-oss -f custom-values.yaml https://github.com/cyberark/conjur-oss-helm-chart/releases/download/v1.3.8/conjur-oss-1.3.8.tgz &> /dev/null
  echo "Installation done"
  oc adm policy add-scc-to-user anyuid "system:serviceaccount:$PROJECT_NAME:default" &> /dev/null

  CONJUR_OSS_POD_LINE=$( oc get pods | grep conjur-oss | (head -n1 && tail -n1) )

  CONJUR_OSS_POD=$( echo "$CONJUR_OSS_POD_LINE" | awk '{print $1}' )

  for i in {1..50}
  do
    CONTAINERS_STATUS=$(  oc get pods | grep conjur-oss | (head -n1 && tail -n1) | awk '{print $2}' )

    if [ "$CONTAINERS_STATUS" == "2/2" ]; then
      break
    fi
    echo "Waiting for conjur pod to be up..."
    sleep 2
  done

  oc get pods

  if [ "$CONTAINERS_STATUS" != "2/2" ]; then
    echo "Conjur pod did not come up properly - exiting"
    exit 1
  fi

  echo "Create account"
  CONJUR_OUTPUT_INIT=$( oc exec "$CONJUR_OSS_POD" --container=conjur-oss conjurctl account create $ACCOUNT_NAME )
  API_KEY=$( echo "$CONJUR_OUTPUT_INIT" |  grep "API key" | awk '{print $5}' )
  echo "Create CLI pod"
  oc create -f conjur-cli.yaml

}

function config {

  echo "Creating basic configuration to Conjur"
  CONJUR_CLI_POD=$( oc get pods | grep conjur-cli | (head -n1 && tail -n1) | cut -f 1 -d " " )

  mkdir -p policy

  echo -e "admin\n$API_KEY" > policy/authnInput

  cat templates/policy-hosts-to-authenticate.yaml | sed s/'{{ AUTHENTICATOR }}'/$AUTHENTICATOR/g | sed s/'{{ PROJECT_NAME }}'/$PROJECT_NAME/g > policy/policy-hosts-to-authenticate.yaml

  cat templates/policy-for-webservice.yaml | sed s/'{{ AUTHENTICATOR }}'/$AUTHENTICATOR/g > policy/policy-for-webservice.yaml

  cat templates/policy-for-variables.yaml | sed s/'{{ AUTHENTICATOR }}'/$AUTHENTICATOR/g | sed s/'{{ PROJECT_NAME }}'/$PROJECT_NAME/g > policy/policy-for-variables.yaml

  echo "Load conjur policy"

  oc rsync policy "$CONJUR_CLI_POD":/
  oc rsync conjur_scripts "$CONJUR_CLI_POD":/

    oc exec -it "$CONJUR_CLI_POD" conjur init <<< "https://conjur-oss
yes
$ACCOUNT_NAME
y
"
    oc exec -it "$CONJUR_CLI_POD" conjur login < policy/authnInput
	
    oc exec -it "$CONJUR_CLI_POD" conjur policy load -b root -f policy/policy-hosts-to-authenticate.yaml
    oc exec -it "$CONJUR_CLI_POD" conjur policy load -b root -f policy/policy-for-webservice.yaml
    oc exec -it "$CONJUR_CLI_POD" conjur policy load -b root -f policy/policy-for-variables.yaml
    oc exec -it "$CONJUR_CLI_POD" conjur variable set -i variables/mypassword -v 123

  echo "Create certificate"
  oc exec -it "$CONJUR_CLI_POD" ./conjur_scripts/cert_script.sh $ACCOUNT_NAME $AUTHENTICATOR
  oc exec -it "$CONJUR_CLI_POD" cat /root/conjur-server.pem > conjur-cert.pem
  oc delete --ignore-not-found=true configmap conjur-cert
  ssl_certificate=$(cat conjur-cert.pem )
  oc create configmap conjur-cert --from-literal=ssl-certificate="$ssl_certificate"

  oc delete --ignore-not-found=true configmap conjur-cert-java
  oc create configmap conjur-cert-java --from-file=ssl-certificate=conjur-cert.pem
}

usage()
{
  cat << EOF

    Installs Conjur with Conjut CLI on OpenShift

    Usage: installer.sh [options]

      -h, --help                      Shows this help message
      --ocp-url <url>                 OpenShift URL (mandatory)
      --project-name <project>        OpenShift project name (mandatory)
      --account-name <account>        Conjur account name (mandatory)
      --authenticator <authenticator> Conjur authenticator (mandatory)
EOF
}

while [ "$1" != "" ]; do
  case $1 in 
    --ocp-url )	        shift
                        OPENSHIFT_URL=$1
                        ;;
    --project-name )    shift
                        PROJECT_NAME=$1
                        ;;
    --account-name )	shift
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

OPENSHIFT_URL=$(prepare_input "$OPENSHIFT_URL" "OpenShift URL")
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


