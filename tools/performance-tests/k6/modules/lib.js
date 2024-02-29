/**
 * This module exports shared functions for k6 scenarios.
 *
 */
import http from "k6/http";
import {check, fail} from "k6";
import * as conjurApi from "./api.js";
import {uuidv4} from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const requiredEnvVars = [
  "APPLIANCE_MASTER_URL",
  "APPLIANCE_FOLLOWER_URL",
  "CONJUR_ADMIN_API_KEY",
  "CONJUR_ACCOUNT",
  "CONJUR_IDENTITY"
];

/**
 * The setup() function is a k6 hook for tests. Import this in your scenario
 * if you need your tests to obtain a conjur authentication token.
 *
 * NOTE: this does not currently account for expiration of tokens. Tokens last
 * for 6 (or 8) minutes!
 *
 * See: https://k6.io/docs/using-k6/test-life-cycle/
 * @returns
 */
export function setup() {
  // TODO: get these from env vars
  const env = parse_env();

  // authn to obtain token
  const authRes = conjurApi.authenticate(
    http,
    env
  );

  check(authRes, {
    "status is 200": (r) => r.status === 200,
  });

  const token = authRes.body

  return {
    token
  };
}

function isEnvironmentVariableUnset(name) {
  if (__ENV[name]) {
    return false
  }
  console.error(`Missing a required environment variable '${name}'.`)
  return true
}

/**
 * Exits the test process if a required environment variable is unset.
 */
export function checkRequiredEnvironmentVariables(vars) {
  let should_fail = false;

  // This logic will determine if any required environment variables are
  // missing. It will display all missing environment variables (if any).
  for (const name of vars) {
    const tmp = isEnvironmentVariableUnset(name);
    if (!should_fail) {
      should_fail = tmp
    }
  }

  // Will force an exit if at least one required environment variable is unset.
  if (should_fail) {
    fail("A required environment variable(s) is undefined.");
  }
}

export function get_env_var(name) {
  return __ENV[name] ? __ENV[name].trim() : null
}

export function parse_env() {
  checkRequiredEnvironmentVariables(requiredEnvVars);

  return {
    apiKey: get_env_var("CONJUR_ADMIN_API_KEY"),
    applianceMasterUrl: get_env_var("APPLIANCE_MASTER_URL"),
    applianceFollowerUrl: get_env_var("APPLIANCE_FOLLOWER_URL"),
    conjurAccount: get_env_var("CONJUR_ACCOUNT"),
    conjurIdentity: encodeURIComponent(get_env_var("CONJUR_IDENTITY")),
    secretIdentity: get_env_var("SECRET_IDENTITY"),
    startLobs: parseInt(get_env_var("START_LOBS")),
    startLobSafe: parseInt(get_env_var("START_LOB_SAFE")),
    startLobSafeSecret: parseInt(get_env_var("START_LOB_SAFE_SECRET")),
    endLobs: parseInt(get_env_var("END_LOBS")),
    endLobSafe: parseInt(get_env_var("END_LOB_SAFE")),
    endLobSafeSecret: parseInt(get_env_var("END_LOB_SAFE_SECRET")),
    policyFile: get_env_var("POLICY_FILE"),
    policyId: get_env_var("POLICY_ID"),
  }
}

export function uuid() {
  return uuidv4();
}

// Generating policy for one LOB and one safe (with two variables)
export function create_lobs_policy(identifier) {
  return `- !group AutomationVault-admins

- !policy
  id: AutomationVault
  owner: !group AutomationVault-admins
  body:
    - !group lob-1-admins
    - !policy
      id: lob-1-${identifier}
      owner: !group lob-1-admins
      body:
        - !group safe-1-admins
        - !policy
          id: safe-1-${identifier}/delegation
          owner: !group safe-1-admins
          body:
            - !group consumers
            - !group viewers
        - !policy
          id: safe-1-${identifier}
          body:
            - &lob-1-safe-1-account-1-variables
              - !variable
                id: account-1/variable-1
                annotations:
                  cyberark-vault: 'true'
                  cyberark-vault/accounts: AutomationVault/safe-1-${identifier}/account-1
              - !variable
                id: account-1/variable-2
                annotations:
                  cyberark-vault: 'true'
                  cyberark-vault/accounts: AutomationVault/safe-1-${identifier}/account-1

            - !permit
              resource: *lob-1-safe-1-account-1-variables
              privileges: [ read, execute ]
              role: !group /AutomationVault/lob-1-${identifier}/safe-1-${identifier}/delegation/consumers
            - !permit
              resource: *lob-1-safe-1-account-1-variables
              privileges: [ read ]
              role: !group /AutomationVault/lob-1-${identifier}/safe-1-${identifier}/delegation/viewers`
}

// Generating policy for one host
export function create_hosts_policy(identifier) {
  return `- !policy
  id: AutomationVault-hosts
  body:
    - !policy
      id: lob-1-${identifier}
      owner: !group /AutomationVault/lob-1-admins
      body:
        - !policy
          id: safe-1-${identifier}
          owner: !group /AutomationVault/lob-1-${identifier}/safe-1-admins
          body:
          - !layer hosts
          - &lob-1-safe-1-hosts
            - !host host-1-${identifier}
          - !grant
            role: !layer hosts
            members: *lob-1-safe-1-hosts
- !grant
  role: !group AutomationVault/lob-1-${identifier}/safe-1-${identifier}/delegation/viewers
  members: !layer AutomationVault-hosts/lob-1-${identifier}/safe-1-${identifier}/hosts`;
}

// Generating policy for one user
export function create_users_policy(identifier) {
  return `- !policy
  id: AutomationVault-users
  body:
    - !policy
      id: lob-1-${identifier}
      owner: !group /AutomationVault/lob-1-admins
      body:
        - !policy
          id: safe-1-${identifier}
          owner: !group /AutomationVault/lob-1-${identifier}/safe-1-admins
          body:
          - !group users
          - &lob-1-safe-1-users
            - !user user-1-${identifier}
          - !grant
            role: !group users
            members: *lob-1-safe-1-users
- !grant
  role: !group AutomationVault/lob-1-${identifier}/safe-1-${identifier}/delegation/consumers
  members: !group AutomationVault-users/lob-1-${identifier}/safe-1-${identifier}/users`;
}
