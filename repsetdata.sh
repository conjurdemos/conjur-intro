#!/bin/bash

set -euo pipefail

OUTPUT_NAME="variables-by-replication-set-$(date +"%Y_%m_%d_%I_%M_%s").csv" 
SELECT_STATEMENT=$(cat <<EOF
        SELECT  
          RTRIM(LTRIM(REPLACE(CAST(replication_sets AS varchar), '{}', 'Full' ), '{'),'}') AS "ReplicationSets", 
          policy_id AS "Policy",
          identifier(resource_id) as "Variable",
        FROM resources 
          WHERE 
            policy_id NOT LIKE 'system%'
          AND 
            resource_id LIKE '%:variable:%'
        ORDER BY replication_sets, resource_id ASC
EOF
)
     
parse_parameters() {
  POSITIONAL_ARGS=()

  while [[ $# -gt 0 ]]; do
    case "${1:-}" in
    --podman)
      CONTAINERS_PLATFORM="podman"
      shift ;;
    --docker)
      CONTAINERS_PLATFORM="docker"
      shift ;;
    -h | --help ) print_help
      shift ;;
    --) shift; 
        break 
        ;;
    -*|--*)
      echo "Unknown option $1"
      exit 1
      ;;
    *)
      POSITIONAL_ARGS+=("$1") # save positional arg
      shift # past argument
      ;;    
    esac
  done
  if [ ${#POSITIONAL_ARGS[@]} -eq 1 ]; then
      CONTAINER_NAME=${POSITIONAL_ARGS[0]}
  else
    echo "There must be exacly one positional argument. Run $0 for more information."
    exit 1
  fi
}

print_help() {
  cat <<EOF
Generates a csv of replication sets and the variables that belong to them.
Usage: repsetdata.sh <appliance-container> [options]
    --podman          Indicates container is Podman
    -h, --help        Shows this help message.
EOF
  exit
}


main() {
  parse_parameters "$@"
  CONTAINERS_PLATFORM="${CONTAINERS_PLATFORM:-docker}"
  CONTAINER_NAME="${CONTAINER_NAME:-ERROR}"
  "$CONTAINERS_PLATFORM" exec --user conjur "$CONTAINER_NAME" psql -c "COPY ($SELECT_STATEMENT) TO STDOUT CSV HEADER" > $OUTPUT_NAME && {
    echo "Saved to $OUTPUT_NAME"
  }
}


main "$@"
