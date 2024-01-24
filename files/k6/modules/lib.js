/**
 * This module exports shared functions for k6 scenarios.
 * 
 */
import http from "k6/http";
import { check, fail } from "k6";
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import * as conjurApi from "./api.js";

export const requiredEnvVars = [
  "APPLIANCE_URL",
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

function isEnvironmentVariableUnset(name, value) {
  if (__ENV[name]) {
    return false
  }
  console.error(`Missing a required environment variable '${name}'.`)
  return true
}

/**
 * Exits the test process if a required environment variable is unset.
 */
export function checkRequiredEnvironmetVariables(vars) {
  let should_fail = false;

  // This logic will determine if any required environment variables are
  // missing. It will display all missing environment variables (if any).
  for (const name of vars) {
    const tmp = isEnvironmentVariableUnset(name) ? true : false;
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
  checkRequiredEnvironmetVariables(requiredEnvVars);

  return {
    apiKey: get_env_var("CONJUR_ADMIN_API_KEY"),
    applianceUrl: get_env_var("APPLIANCE_URL"),
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
  }
}

export function auto_token_refreshing_http_client() {
  var diff = new Date() - refreshed
  if (diff > 1) {
    console.log(`refresh the token`)
    refreshed = new Date()
  }

  return http;
}

/**
 * WARNING: this is not cryptographically secure, but it is enough randomness
 * for our use case.
 * 
 * Source: https://stackoverflow.com/a/8809472
 * @returns string
 */
export function generateUUID() { // Public Domain/MIT
  var d = new Date().getTime();//Timestamp
  var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16;//random number between 0 and 16
    if (d > 0) {//Use timestamp until depleted
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {//Use microseconds since page-load if supported
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function generate_secret_identity(
  startLobs,
  startLobSafe,
  startLobSafeSecret,
  endLobs,
  endLobSafe,
  endLobSafeSecret
) {
  const lob = `vault-synchronizer/lob-${randomIntBetween(startLobs, endLobs)}`;
  const safe = `safe-${randomIntBetween(startLobSafe, endLobSafe)}`;
  const secret = `variable-${randomIntBetween(startLobSafeSecret, endLobSafeSecret)}`;
  const identity = `${lob}/${safe}/${secret}`;
  return identity;
}