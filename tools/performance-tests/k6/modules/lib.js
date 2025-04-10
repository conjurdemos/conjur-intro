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
  "APPLIANCE_READ_URL",
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
  const env = parseEnv();

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
  let shouldFail = false;

  // This logic will determine if any required environment variables are
  // missing. It will display all missing environment variables (if any).
  for (const name of vars) {
    const tmp = isEnvironmentVariableUnset(name);
    if (!shouldFail) {
      shouldFail = tmp
    }
  }

  // Will force an exit if at least one required environment variable is unset.
  if (shouldFail) {
    fail("A required environment variable(s) is undefined.");
  }
}

export function getEnvVar(name) {
  return __ENV[name] ? __ENV[name].trim() : null
}

export function parseEnv() {
  checkRequiredEnvironmentVariables(requiredEnvVars);

  return {
    apiKey: getEnvVar("CONJUR_ADMIN_API_KEY"),
    applianceMasterUrl: getEnvVar("APPLIANCE_MASTER_URL"),
    uuid: getEnvVar("UUID"),
    applianceReadUrl: getEnvVar("APPLIANCE_READ_URL"),
    conjurAccount: getEnvVar("CONJUR_ACCOUNT"),
    conjurIdentity: encodeURIComponent(getEnvVar("CONJUR_IDENTITY")),
    conjurPassword: getEnvVar("CONJUR_PASSWORD"),
    secretIdentity: getEnvVar("SECRET_IDENTITY"),
    startLobs: parseInt(getEnvVar("START_LOBS")),
    startLobSafe: parseInt(getEnvVar("START_LOB_SAFE")),
    startLobSafeSecret: parseInt(getEnvVar("START_LOB_SAFE_SECRET")),
    endLobs: parseInt(getEnvVar("END_LOBS")),
    endLobSafe: parseInt(getEnvVar("END_LOB_SAFE")),
    endLobSafeSecret: parseInt(getEnvVar("END_LOB_SAFE_SECRET")),
    policyFile: getEnvVar("POLICY_FILE"),
    perfTestDynamicSecretsAwsAccessKeyId: getEnvVar("PERF_TEST_DYNAMIC_SECRETS_AWS_ACCESS_KEY_ID"),
    perfTestDynamicSecretsAwsSecretAccessKey: getEnvVar("PERF_TEST_DYNAMIC_SECRETS_AWS_SECRET_ACCESS_KEY"),
    perfTestDynamicSecretsAwsAssumeRoleArn: getEnvVar("PERF_TEST_DYNAMIC_SECRETS_AWS_ASSUME_ROLE_ARN"),
    policyId: getEnvVar("POLICY_ID"),
    uniqueIdentifierPrefix: getEnvVar("UNIQUE_IDENTIFIER_PREFIX"),
  }
}

export function uuid() {
  return uuidv4();
}

// Generating policy for one LOB and one safe (with two variables)
export function createLobsPolicy(identifier) {
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
export function createHostsPolicy(identifier) {
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
  role: !group AutomationVault/lob-1-${identifier}/safe-1-${identifier}/delegation/consumers
  members: !layer AutomationVault-hosts/lob-1-${identifier}/safe-1-${identifier}/hosts`;
}

// Generating policy for one user
export function createUsersPolicy(identifier) {
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

export function createDynamicSecretsPolicy(arn) {
  return `- !policy
  id: data/dynamic
  body:

  - !variable
    id: ds-assume-role
    annotations:
      dynamic/issuer: my-aws
      dynamic/method: assume-role
      dynamic/role_arn: "${arn}"

  - !variable
    id: ds-federation-token
    annotations:
      dynamic/issuer: my-aws
      dynamic/method: federation-token`;
}


export function createBulkDynamicSecretsPolicy(arn, identifier, iterations) {
  let policy = ``;

  for (let i = 0; i <= iterations; i++) {
    policy += `
    - !policy
      id: data/dynamic/${identifier}-${i}
      body:
        - !variable
          id: ds-assume-role
          annotations:
            dynamic/issuer: my-aws
            dynamic/method: assume-role
            dynamic/role_arn: "${arn}"`;
  }

  return policy;
}


export function createBulkStaticSecretsPolicy(identifier, iterations) {
  let policy = ``;

  for (let i = 0; i <= iterations; i++) {
    policy += `
    - !policy
      id: ${identifier}-${i}
      body:
        - !variable
          id: ds-assume-role`;
  }

  return policy;
}


export function createNestedPolicy(level, maxLevel) {
  if (level > maxLevel) {
    return '';
  }

  const randomUUID = () => {
    let result = '';
    while (result.length < 10) {
      let randomChar = String.fromCharCode(Math.floor(Math.random() * 26) + 97);
      result += randomChar;
    }
    return result;
  };

  let policy = `- !policy
  id: ${randomUUID()}`;

  let nestedPolicy = createNestedPolicy(level + 1, maxLevel);
  if (nestedPolicy) {
    policy += `
  body:
${nestedPolicy.split('\n').map(line => '    ' + line).join('\n')}`;
  }

  return policy;
}

export function create1kPolicies(id) {
  let policies = '';
  for (let i = 1; i <= 1000; i++) {
    policies += `- !policy\n  id: dev${id}-${i}\n`;
  }
  return policies;
}
export function checkNodeType(url) {
  if (url.includes('-master')) {
    return "DAP Leader";
  } else if (url.includes('host.docker.internal') || url.includes('-k8s-follower')) {
    return "K8S Follower";
  } else if (url.includes('-follower')) {
    return "DAP Follower";
  } else {
    return "Unknown";
  }
}

export function generateMetricsArray(nodeType, testName, vusMax, httpReqs, avgResponseTime, maxResponseTime, minResponseTime, failRate) {
  return [
    ['Node type', 'Action', 'Virtual users', 'Requests handled by Conjur per second', 'Average response time (ms)', 'Max response time (ms)', 'Min response time (ms)', '% of failed requests'],
    [nodeType, testName, vusMax, httpReqs, avgResponseTime, maxResponseTime, minResponseTime, failRate*100]
  ];
}

export function generateBurnInMetricsArray(nodeType, testName, vusMax, iterations, avgHttpResponseTime, maxHttpResponseTime, minHttpResponseTime, avgCliResponseTime, maxCliResponseTime, minCliResponseTime, failRate, cliFailRate) {
  return [
    ['Node type', 'Action', 'Virtual users', 'Iterations per second', 'Average HTTP response time (ms)', 'Max HTTP response time (ms)', 'Min HTTP response time (ms)', 'Average CLI response time (ms)', 'Max CLI response time (ms)', 'Min CLI response time (ms)', '% of failed HTTP requests', '% of failed CLI calls'],
    [nodeType, testName, vusMax, iterations, avgHttpResponseTime, maxHttpResponseTime, minHttpResponseTime, avgCliResponseTime, maxCliResponseTime, minCliResponseTime, failRate*100, cliFailRate*100]
  ];
}

export function retrieveApiKey(apiKeys, index, lob_name, safe_name) {
  // If desired lob and safe is defined, fetch api key matching that lob and safe
  if (lob_name && safe_name) {
    // Iterate through api keys and check if lob and safe are matching
    for (let i = 0; i < apiKeys.length; i++) {
      if (apiKeys.at(i).lob_name === lob_name && apiKeys.at(i).safe_name === safe_name) {
        return apiKeys.at(i);
      }
    }
  } else {
    return apiKeys.at(index);
  }
}
