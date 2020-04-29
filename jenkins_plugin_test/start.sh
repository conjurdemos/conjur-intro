#!/bin/bash -ex

function finish {
  docker-compose down -v
  rm -rf cli_cache
}

function print_help() {
  cat << EOF
NAME
    Starts and configures a Conjur Appliance. Once Conjur is configured, the
    appliance logs are streamed.


SYNOPSIS
    start [global options]

GLOBAL OPTIONS
    -h, --help                          - Show this message

    --skip-pull                         - Does not pull a fresh Conjur master before starting

    -t, --tag <appliance-tag>           - Starts a Conjur Appliance of the version specified

    --with-config                       - Configures the Appliance using the `config/conjur.json` file

EOF
exit
}

PULL_ARGS="--pull"
TAG="5.0-stable"
CONFIG=""
while true ; do
  case "$1" in
    --skip-pull ) PULL_ARGS="" ; shift ;;
    -h | --help ) print_help ; shift ;;
    -t | --tag ) shift ; TAG="$1" ; shift ;;
    --with-config ) CONFIG="-j /opt/config/conjur.json" ; shift ;;
     * ) if [ -z "$1" ]; then break; else echo "$1 is not a valid option"; exit 1; fi;;
  esac
done

trap finish EXIT

export IMAGE_TAG=$TAG

if [ "$PULL_ARGS" == "--pull" ]; then
  docker pull registry2.itci.conjur.net/conjur-appliance:$IMAGE_TAG
  docker pull conjurinc/cli5
  docker pull jenkins/jenkins
fi

docker-compose up -d --no-deps conjur

docker-compose exec conjur bash -c "
  evoke configure master $CONFIG -h conjur-master.local -p MySecretP@ss1 --accept-eula demo
"

docker-compose logs -f conjur
