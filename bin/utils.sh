#!/usr/bin/env bash

# Prefix of the registry the conjur-appliance image is pulled from, exported as
# APPLIANCE_REGISTRY for docker-compose.yml and bin/podman-dap.
#   1. APPLIANCE_REGISTRY, if already set, is used as is.
#   2. Otherwise, if the Artifactory host is known (ARTIFACTORY_HOST, or
#      INFRAPOOL_ARTIFACTORY_HOST on an InfraPool agent), the image comes from
#      <host>/appliance-docker-latest-local.
#   3. Otherwise the registry.tld alias is kept; it must resolve on this machine
#      (for example through /etc/hosts).
# The Artifactory host is never written in this repo.
function appliance_registry {
  local host="${INFRAPOOL_ARTIFACTORY_HOST:-${ARTIFACTORY_HOST:-}}"
  if [[ -n "${APPLIANCE_REGISTRY:-}" ]]; then
    printf '%s' "${APPLIANCE_REGISTRY%/}"
  elif [[ -n "${host}" ]]; then
    printf '%s/appliance-docker-latest-local' "${host}"
  else
    printf 'registry.tld'
  fi
}

function dotenv {
  local envfile="${1:-.env}"

  # Ensure envfile exists
  if ! $(ls ${envfile} >/dev/null 2>&1); then
    echo "${envfile} not found";
    return 1;
  fi

  # Export variables first before we source the envfile below
  local envvars=$(cat ${envfile} | cut -f1 -d=)
  if [[ -z "${envvars}" ]]; then
    echo "nothing to source, ${envfile} is empty."
    return
  fi

  echo "envvars sourced from ${envfile}:"
  echo "${envvars}"
  export $(echo ${envvars})

  # Ensure all env vars values are wrapped in quotation marks before unescaping them,
  # then source.
  source <(cat ${envfile} | sed -E 's/\=([^"].*)/="\1"/' | sed -E 's/\="(.*)"$/=\$\(printf \"%b\" "\1"\)/')
}

function _wait_for_master {
  local master_url="https://localhost:${CONJUR_MASTER_PORT}"

  echo "Waiting for DAP Master to be ready... ${master_url}"

  # Wait for 10 successful connections in a row
  local COUNTER=0

  TIMEOUT="${1:-600}"
  SECONDS=0
  while [ $COUNTER -lt 10 ]; do
    if [ $SECONDS -ge $TIMEOUT ]; then
      echo "Timed out waiting for DAP Master to be ready"
      exit 1
    fi

    local response
    response=$(curl -k --silent --head "$master_url/health" || true)

    if ! echo "$response" | grep -iq "Conjur-Health: OK"; then
      sleep 5
      COUNTER=0
    else
      (( COUNTER=COUNTER+1 ))
    fi

    sleep 1
    echo "Successful Health Checks: $COUNTER"
  done
}

function retry_5_times() {
    local cmd=$1
    local attempt=0
    while [ $attempt -lt 5 ]; do
        result=$(eval "$cmd")
        if [ "$?" -eq 0 ]; then
            break
        fi
        attempt=$((attempt + 1))
        sleep 5
    done

    if [[ ! -z "$result" ]]; then
      echo "$result"
    fi
}
