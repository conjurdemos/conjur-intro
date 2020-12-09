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
