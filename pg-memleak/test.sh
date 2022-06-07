#!/bin/bash
#
# Test the JMeter Docker image using a trivial test plan. By default, this
# script will run with the assumption that it is testing against the
# conjur-intro project. Pass in --oss to run with against the cyberark/conjur
# dev environment instead (oss). This script is not used for testing against
# conjur oss in k8s.

PLATFORM="enterprise"
JMETER_CONTAINER_NAME="jmeter-enterprise"

parse_args(){
	while test $# -gt 0; do
		case "$1" in
			--oss)
				PLATFORM="oss"
				shift
				;;
			-?*)
				printf 'WARN: Unknown option (ignored): %s\n' "$1" >&2
				;;
			*)  # Default case: No more options, so break out of the loop.
				break
		esac
		shift
	done
}

main() {
	parse_args "$@"

	# Example for using User Defined Variables with JMeter
	# These will be substituted in JMX test script
	# See also: http://stackoverflow.com/questions/14317715/jmeter-changing-user-defined-variables-from-command-line
	local T_DIR=tests/conjur-enterprise
	# assuming conjur_intro
	local DOCKER_NETWORK="dap_net"

	if [ "$PLATFORM" = "oss" ]; then
		T_DIR=tests/conjur-oss
		DOCKER_NETWORK="dev_default"
		JMETER_CONTAINER_NAME="jmeter-oss"
	fi

	echo "Running tests against the '$PLATFORM' dev environment."
	echo "Jmeter logs will be output to: $T_DIR"

	# export for the run.sh script
	export DOCKER_NETWORK
	export JMETER_CONTAINER_NAME

	# Reporting dir: start fresh
	R_DIR=${T_DIR}/report
	rm -rf ${R_DIR} > /dev/null 2>&1
	mkdir -p ${R_DIR}

	/bin/rm -f ${T_DIR}/test-plan.jtl ${T_DIR}/jmeter.log  > /dev/null 2>&1

	./run.sh -Dlog_level.jmeter=DEBUG \
		-n -t ${T_DIR}/test-plan.jmx -l ${T_DIR}/test-plan.jtl -j ${T_DIR}/jmeter.log \
		-e -o ${R_DIR}

	echo "==== jmeter.log ===="
	cat ${T_DIR}/jmeter.log

	echo "==== Raw Test Report ===="
	cat ${T_DIR}/test-plan.jtl

	echo "==== HTML Test Report ===="
	echo "See HTML test report in ${R_DIR}/index.html"

}

main "$@"