#!/bin/bash
#
# Run JMeter Docker image with options
JMETER_VERSION=${JMETER_VERSION:-"latest"}
IMAGE="justb4/jmeter:${JMETER_VERSION}"

# Run jmeter tests
echo "Running jmeter, connected to network: $DOCKER_NETWORK"
sleep 1
docker run --rm --name ${JMETER_CONTAINER_NAME} --network ${DOCKER_NETWORK} -i -v ${PWD}:${PWD} -w ${PWD} ${IMAGE} $@