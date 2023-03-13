#!/bin/bash

announce() {
  echo "++++++++++++++++++++++++++++++++++++++"
  echo ""
  echo "$@"
  echo ""
  echo "++++++++++++++++++++++++++++++++++++++"
}

run_conjur_cmd_as_admin() {
  local command=$(cat $@)

  conjur logout > /dev/null
  conjur login -i admin -p "$CONJUR_ADMIN_PASSWORD" > /dev/null

  local output=$(eval "$command")

  conjur logout > /dev/null
  echo "$output"
}

load_policy() {
  local POLICY_FILE=$1

  run_conjur_cmd_as_admin <<CMD
conjur policy load -b root -f "policy/$POLICY_FILE"
CMD
}

rotate_host_api_key() {
  local host=$1

  run_conjur_cmd_as_admin <<CMD
conjur host rotate-api-key -i $host
CMD
}
