import http from "k6/http";
import {sleep, check} from "k6";
import exec from 'k6/execution';
import {Trend, Rate} from 'k6/metrics';
import * as conjurApi from "./modules/api.js";
import * as lib from "./modules/lib.js";
import papaparse from "./modules/papaparse.min.js";
import {SharedArray} from 'k6/data';

/**
 *  Init stage
 */
const requiredEnvVars = [
  "K6_CUSTOM_GRACEFUL_STOP",
  "K6_CUSTOM_VUS",
  "K6_CUSTOM_ITERATIONS"
];

// These are custom k6 metrics that will be reported in the k6 summary.
const authenticateTrend = new Trend('http_req_duration_post_authn', true);
const authenticateFailRate = new Rate('http_req_failed_post_authn');
const readSecretsIndividuallyTrend = new Trend('http_req_duration_get_secrets_individually', true);
const readSecretsIndividuallyFailRate = new Rate('http_req_failed_get_secrets_individually');
const readSecretsBatchTrend = new Trend('http_req_duration_get_secrets_batch', true);
const readSecretsBatchFailRate = new Rate('http_req_failed_get_secrets_batch');
const writeSecretsTrend = new Trend('http_req_duration_write_secrets', true);
const writeSecretsFailRate = new Rate('http_req_failed_write_secrets');
const individuallyCreatePolicyTrend = new Trend('http_req_duration_individually_create_policy', true);
const individuallyCreatePolicyFailRate = new Rate('http_req_failed_individually_create_policy');

lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = lib.get_env_var("K6_CUSTOM_GRACEFUL_STOP");
const vus = lib.get_env_var("K6_CUSTOM_VUS")
const iterations = lib.get_env_var("K6_CUSTOM_ITERATIONS")

const env = lib.parse_env();

const csvData = new SharedArray('Secrets', function () {
  // Load CSV file and parse it using Papa Parse
  return papaparse.parse(open("./data/secrets.csv"), {header: true}).data;
});
const writeSecretsData = new SharedArray('WriteSecrets', function () {
  // Load CSV file and parse it using Papa Parse
  return papaparse.parse(open("./data/test-variable-secrets.csv"), {header: true, skipEmptyLines: true}).data;
});

const usersPolicy = open("./data/policy/users.yml");
const policy = open("./data/policy/policy.yml");
const myAppStagingPolicy = open("./data/policy/myapp_staging.yml");
const myAppPolicy = open("./data/policy/myapp.yml");
const applicationGrantsPolicy = open("./data/policy/application_grants.yml");
const hostsPolicy = open("./data/policy/hosts.yml");
const testVariablePolicy = open("./data/policy/test-variable.yml");

let start = new Date()

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    individual1: {
      executor: 'per-vu-iterations',
      maxDuration: "1h",
      vus: 5,
      iterations: 6200, // 5 * 20 * 62 (from previous jmeter tests)
      exec: "individually_retrieve_secrets",
      gracefulStop
    },
    individual2: {
      executor: 'per-vu-iterations',
      maxDuration: "1h",
      vus: 5,
      iterations: 6200, // 5 * 20 * 62 (from previous jmeter tests)
      exec: "individually_retrieve_secrets",
      gracefulStop
    },
    individual3: {
      executor: 'per-vu-iterations',
      maxDuration: "1h",
      vus: 1,
      iterations: 1240, // 20 * 62 (from previous jmeter tests)
      exec: "individually_retrieve_secrets",
      gracefulStop
    },
    individual4: {
      executor: 'per-vu-iterations',
      maxDuration: "1h",
      vus: 1,
      iterations: 1240, // 20 * 62 (from previous jmeter tests)
      exec: "individually_retrieve_secrets",
      gracefulStop
    },
    batch1: {
      executor: 'per-vu-iterations',
      maxDuration: "1h",
      vus: 1,
      iterations: 1240, // 20 * 62 (from previous jmeter tests)
      exec: "batch_retrieve_secrets",
      gracefulStop
    },
    batch2: {
      executor: 'per-vu-iterations',
      maxDuration: "1h",
      vus: 1,
      iterations: 1240, // 20 * 62 (from previous jmeter tests)
      exec: "batch_retrieve_secrets",
      gracefulStop
    },
    batch3: {
      executor: 'per-vu-iterations',
      maxDuration: "1h",
      vus: 5,
      iterations: 6200, // 5 * 20 * 62 (from previous jmeter tests)
      exec: "batch_retrieve_secrets",
      gracefulStop
    },
    batch4: {
      executor: 'per-vu-iterations',
      maxDuration: "1h",
      vus: 5,
      iterations: 6200, // 5 * 20 * 62 (from previous jmeter tests)
      exec: "batch_retrieve_secrets",
      gracefulStop
    },
    individually_create_policy: {
      executor: 'per-vu-iterations',
      maxDuration: "1h",
      // We can only create one policy at a time (409 Conflict can occur because all policies are loaded into the same root policy)
      vus: 1,
      iterations: 500,
      exec: "individually_create_policy",
      gracefulStop
    },
    write_secrets: {
      executor: 'shared-iterations',
      maxDuration: "1h",
      vus: vus,
      iterations: writeSecretsData.length,
      exec: "write_secrets",
      gracefulStop
    },
  }, thresholds: {
    // TODO: To be set later after benchmark tests are fully refactored
    // http_reqs: ['rate > 75']
    checks: ['rate == 1.0']
  }
};

export function loadSecrets() {
  const {
    applianceMasterUrl,
    conjurAccount
  } = env;
  let reqs = [];
  let slice = [...csvData];
  while (slice.length > 0) {
    if (slice.length) {
      const item = slice.pop();
      // The value to write
      const secretIdentity = item.resource_id.replace(`${conjurAccount}:variable:`, '');
      const body = item.resource_body

      const headers = {'Authorization': `Token token="${env.token}"`}
      const r = {
        method: 'POST',
        url: `${applianceMasterUrl}/secrets/${conjurAccount}/variable/${encodeURIComponent(secretIdentity)}`,
        body,
        params: {
          headers: headers
        },
      }
      reqs.push(r);
    } else {
      break;
    }

    const responses = http.batch(reqs);

    for (let i = 0; i < responses.length; i++) {
      console.log("RESPONSE CODE:", responses[i].status)
      check(responses[i], {
        "status is 201": (r) => r.status === 200 || r.status === 201,
      });
    }

    // dump the reqs for the next iteration
    reqs = [];
  }
}

export function loadPolicy(policyContent, policyId) {
  // create policy
  const lobsPolicyRes = conjurApi.load_policy(
    http,
    env,
    policyId,
    policyContent
  );

  console.log("RESPONSE BODY START", lobsPolicyRes.body, "RESPONSE BODY END")

  check(lobsPolicyRes, {
    "status is 201": (r) => r.status === 201,
  });
}

export function setup() {
  env.applianceUrl = env.applianceMasterUrl
  authn()
  loadPolicy(usersPolicy, "root")
  loadPolicy(policy, "root")
  loadPolicy(myAppStagingPolicy, "staging")
  loadPolicy(myAppPolicy, "production")
  loadPolicy(applicationGrantsPolicy, "root")
  loadPolicy(hostsPolicy, "root")
  loadSecrets()
  loadPolicy(testVariablePolicy, "root")
}

export function authn() {
  // Ensure that authn trends are tracked if they fail
  env.authenticateTrend = authenticateTrend;
  env.authenticateFailRate = authenticateFailRate;

  // Authn to obtain token
  const res = conjurApi.authenticate(
    http,
    env,
    true
  );
  sleep(0.3);

  env.token = res.body;
}

export function individually_retrieve_secrets() {
  if (__ITER == 0) {
    env.applianceUrl = env.applianceFollowerUrl
    authn();
  }
  let now = new Date()
  // if 6 minutes elapsed, renew authentication
  if (now.getTime() - start.getTime() > 360000) {
    start.setTime(now.getTime())
    authn();
  }
  const identity = `production/myapp/database/username`
  const res = conjurApi.read_secret(http, env, identity);

  readSecretsIndividuallyTrend.add(res.timings.duration);
  readSecretsIndividuallyFailRate.add(res.status !== 200);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "status is not 404": (r) => r.status !== 404,
    "status is not 401": (r) => r.status !== 401,
    "status is not 500": (r) => r.status !== 500
  });
}

export function batch_retrieve_secrets() {
  if (__ITER == 0) {
    env.applianceUrl = env.applianceFollowerUrl
    authn();
  }
  let now = new Date()
  // if 6 minutes elapsed, renew authentication
  if (now.getTime() - start.getTime() > 360000) {
    start.setTime(now.getTime())
    authn();
  }
  const path = `/secrets?variable_ids=demo:variable:production%2Fmyapp%2Fdatabase%2Fusername`
  const res = conjurApi.get(http, env, path);

  readSecretsBatchTrend.add(res.timings.duration);
  readSecretsBatchFailRate.add(res.status !== 200);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "status is not 404": (r) => r.status !== 404,
    "status is not 401": (r) => r.status !== 401,
    "status is not 500": (r) => r.status !== 500
  });
}

export function individually_create_policy() {
  env.applianceUrl = env.applianceMasterUrl
  if (__ITER == 0) {
    authn();
  }
  let now = new Date()
  // if 6 minutes elapsed, renew authentication
  if (now.getTime() - start.getTime() > 360000) {
    start.setTime(now.getTime())
    authn();
  }

  // Creates a unique identifier across all VUs and iterations
  const identifier = `${__VU}-${__ITER}-${lib.uuid()}`;
  const {policyId} = env;

  const lobsPolicyRes = conjurApi.load_policy(
    http,
    env,
    policyId,
    lib.create_lobs_policy(identifier)
  );
  const hostsPolicyRes = conjurApi.load_policy(
    http,
    env,
    policyId,
    lib.create_hosts_policy(identifier)
  );
  const usersPolicyRes = conjurApi.load_policy(
    http,
    env,
    policyId,
    lib.create_users_policy(identifier)
  );

  individuallyCreatePolicyTrend.add(lobsPolicyRes.timings.duration + hostsPolicyRes.timings.duration + usersPolicyRes.timings.duration);
  individuallyCreatePolicyFailRate.add(lobsPolicyRes.status !== 201 || hostsPolicyRes.status !== 201 || usersPolicyRes.status !== 201);

  check(lobsPolicyRes, {
    "status is 201": (r) => r.status === 201,
    "status is not 500": (r) => r.status !== 500
  });
  check(hostsPolicyRes, {
    "status is 201": (r) => r.status === 201,
    "status is not 500": (r) => r.status !== 500
  });
  check(usersPolicyRes, {
    "status is 201": (r) => r.status === 201,
    "status is not 500": (r) => r.status !== 500
  });
}

export function write_secrets() {
  if (__ITER == 0) {
    env.applianceUrl = env.applianceMasterUrl
    authn();
  }
  let now = new Date()
  // if 6 minutes elapsed, renew authentication
  if (now.getTime() - start.getTime() > 360000) {
    start.setTime(now.getTime())
    authn();
  }

  const variable = writeSecretsData[exec.scenario.iterationInTest];
  const resourceId = encodeURIComponent(variable.resource_id);
  const resourceBody = variable.resource_body;

  const response = conjurApi.write_secret(
    http,
    env,
    resourceId,
    resourceBody
  );

  writeSecretsTrend.add(response.timings.duration);
  writeSecretsFailRate.add(response.status !== 201 && response.status !== 201);

  check(response, {
    "status is 201": (r) => r.status === 200 || r.status === 201,
    "status is not 500": (r) => r.status !== 500
  });
}
