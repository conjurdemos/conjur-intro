#!/bin/bash
#
# Run JMeter Docker image with options

NAME="jmeter3"
JMETER_VERSION=${JMETER_VERSION:-"latest"}
IMAGE="justb4/jmeter:${JMETER_VERSION}"

# Finally run (Add to dap-net)
#docker run --rm --name ${NAME} --network dap_net -i -v ${PWD}:${PWD} -w ${PWD} ${IMAGE} $@
docker run --rm --name ${NAME} --network dap_net -i -v ${PWD}:${PWD} -w ${PWD} ${IMAGE} $@