#!/usr/bin/env bash

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
