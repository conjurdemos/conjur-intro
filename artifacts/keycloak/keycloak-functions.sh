#!/usr/bin/env bash

KEYCLOAK_SERVICE_NAME="keycloak"

# The arguments must be unexpanded variable names.  Eg:
#
# _create_keycloak_user '$APP_USER' '$APP_PW' '$APP_EMAIL'
#
# This is because those variables are not available to this script. They are
# available to bash commands run via "docker compose exec keycloak bash
# -c...", since they're defined in the docker-compose.yml.
function _create_keycloak_user() {
  local user_var=$1
  local pw_var=$2
  local email_var=$3

  docker compose exec -T \
    ${KEYCLOAK_SERVICE_NAME} \
    bash -c "/scripts/create-user \"$user_var\" \"$pw_var\" \"$email_var\""
}

function create_keycloak_users() {
  echo "Defining keycloak client"

  docker compose exec -T ${KEYCLOAK_SERVICE_NAME} /scripts/create-client

  echo "Creating user 'alice' in Keycloak"

  # Note: We want to pass the bash command thru without expansion here.
  # shellcheck disable=SC2016
  _create_keycloak_user \
    '$KEYCLOAK_APP_USER' \
    '$KEYCLOAK_APP_USER_PASSWORD' \
    '$KEYCLOAK_APP_USER_EMAIL'

  echo "Creating second user 'bob' in Keycloak"

  # Note: We want to pass the bash command thru without expansion here.
  # shellcheck disable=SC2016
  _create_keycloak_user \
    '$KEYCLOAK_SECOND_APP_USER' \
    '$KEYCLOAK_SECOND_APP_USER_PASSWORD' \
    '$KEYCLOAK_SECOND_APP_USER_EMAIL'

  echo "Creating user in Keycloak that will not exist in conjur"

  # Note: We want to pass the bash command thru without expansion here.
  # shellcheck disable=SC2016
  _create_keycloak_user \
    '$KEYCLOAK_NON_CONJUR_APP_USER' \
    '$KEYCLOAK_NON_CONJUR_APP_USER_PASSWORD' \
    '$KEYCLOAK_NON_CONJUR_APP_USER_EMAIL'
}
