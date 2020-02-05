#!/bin/bash

#set -x

OPENSHIFT_URL=
PROJECT_NAME=
ACCOUNT_NAME=myaccount
AUTHENTICATOR=myauthenticator

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

  oc login $OPENSHIFT_URL
  oc adm prune images
  echo "Creating project $PROJECT_NAME"
  {
    oc new-project $PROJECT_NAME

    TOKEN=$( oc whoami -t )

    DATA_KEY=$( docker-compose run --no-deps --rm conjur data-key generate )

    oc get is
    echo "Installing Conjur OSS application on OpenShift"
    oc delete ClusterRole conjur-oss-conjur-authenticator
    oc delete ClusterRoleBinding conjur-oss-conjur-authenticator
  } &> /dev/null

  ACTUAL_DATA_KEY=$( echo "${DATA_KEY/\//\\\/}" )
  cat templates/custom-values.yaml | sed s/AUTHENTICATOR/$AUTHENTICATOR/g | sed s/ACCOUNT_NAME/$ACCOUNT_NAME/g | sed s/DATA_KEY/$ACTUAL_DATA_KEY/g > custom-values.yaml
  
  echo "Installing conjur-oss"
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
    echo "Conjur POD did not come up properly - exiting"
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

  mkdir policy

  echo -e "admin\n$API_KEY" > policy/authnInput

  cat templates/policy-hosts-to-authenticate.yaml | sed s/AUTHENTICATOR/$AUTHENTICATOR/g | sed s/PROJECT_NAME/$PROJECT_NAME/g > policy/policy-hosts-to-authenticate.yaml

  cat templates/policy-for-webservice.yaml | sed s/AUTHENTICATOR/$AUTHENTICATOR/g > policy/policy-for-webservice.yaml

  cat templates/policy-for-variables.yaml | sed s/AUTHENTICATOR/$AUTHENTICATOR/g | sed s/PROJECT_NAME/$PROJECT_NAME/g > policy/policy-for-variables.yaml

  {
    echo "Load conjur policy"
    oc rsync policy "$CONJUR_CLI_POD":/
    oc rsync conjur_scripts "$CONJUR_CLI_POD":/

    oc exec -it "$CONJUR_CLI_POD" conjur init <<< "https://conjur-oss
yes
$ACCOUNT_NAME
y
"
    oc exec -it "$CONJUR_CLI_POD" conjur authn login < policy/authnInput
	
    oc exec -it "$CONJUR_CLI_POD" conjur policy load root policy/policy-hosts-to-authenticate.yaml
    oc exec -it "$CONJUR_CLI_POD" conjur policy load root policy/policy-for-webservice.yaml
    oc exec -it "$CONJUR_CLI_POD" conjur policy load root policy/policy-for-variables.yaml
    oc exec -it "$CONJUR_CLI_POD" conjur variable values add variables/mypassword 123
    echo "Create certificate"
    oc exec -it "$CONJUR_CLI_POD" ./conjur_scripts/cert_script.sh $ACCOUNT_NAME $AUTHENTICATOR
    oc exec -it "$CONJUR_CLI_POD" cat /root/conjur-$ACCOUNT_NAME.pem > conjur-cert.pem
  }  &> /dev/null

  oc delete --ignore-not-found=true configmap conjur-cert
  ssl_certificate=$(cat conjur-cert.pem )
  oc create configmap conjur-cert --from-literal=ssl-certificate="$ssl_certificate"
  rm -rf trust-store.jks
  openssl x509 -outform der -in conjur-cert.pem -out conjur-cert.crt
  echo "Creating TrustStore file in store/trust-store.jks - for future usage"
  keytool -import -alias ca -keystore trust-store.jks -storepass TrustStore -trustcacerts -file conjur-cert.crt <<< "yes
" &> /dev/null
  mkdir store
  mv trust-store.jks store/.
}

usage()
{
  echo "usage: installer [[[--ocp-url url ] [--with-config] [--project-name project] [--account-name account] [--authenticator authenticator]] | [-h]]"
}

DO_CONFIG=0
while [ "$1" != "" ]; do
  case $1 in 
    --with-config )	DO_CONFIG=1
                        ;;
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

if [ "$DO_CONFIG" == "1" ]; then
  config
fi

rm -rf conjur-cert.crt
rm -rf conjur-cert.pem
rm -rf custom-values.yaml
rm -rf policy

echo "Installation done"


