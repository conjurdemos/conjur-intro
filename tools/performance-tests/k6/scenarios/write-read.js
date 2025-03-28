import http from "k6/http";
import {sleep, check} from "k6";
import {Trend, Rate} from 'k6/metrics';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";
import papaparse from "../modules/papaparse.min.js";
import {SharedArray} from 'k6/data';
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

/**
 *  Init stage
 */

// These are custom k6 metrics that will be reported in the k6 summary.
const authenticateTrend = new Trend('http_req_duration_post_authn', true);
const authenticateFailRate = new Rate('http_req_failed_post_authn');
const readSecretsIndividuallyTrend = new Trend('http_req_duration_get_secrets_individually', true);
const readSecretsIndividuallyFailRate = new Rate('http_req_failed_get_secrets_individually');
const readTwoSecretsBatchTrend = new Trend('http_req_duration_get_two_secrets_batch', true);
const readTwoSecretsBatchFailRate = new Rate('http_req_failed_get_two_secrets_batch');
const readFourSecretsBatchTrend = new Trend('http_req_duration_get_four_secrets_batch', true);
const readFourSecretsBatchFailRate = new Rate('http_req_failed_get_four_secrets_batch');

lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = lib.getEnvVar("K6_CUSTOM_GRACEFUL_STOP");
const maxDuration = '3h';

const env = lib.parseEnv();

const csvData = new SharedArray('Secrets', function () {
  // Load CSV file and parse it using Papa Parse
  return papaparse.parse(open("../data/secrets.csv"), {header: true}).data;
});

const usersPolicy = open("../data/policy/users.yml");
const policy = open("../data/policy/policy.yml");
const myAppStagingPolicy = open("../data/policy/myapp_staging.yml");
const myAppPolicy = open("../data/policy/myapp.yml");
const applicationGrantsPolicy = open("../data/policy/application_grants.yml");
const hostsPolicy = open("../data/policy/hosts.yml");
const testVariablePolicy = open("../data/policy/test-variable.yml");

let start = new Date()

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    individual1: {
      executor: 'per-vu-iterations',
      maxDuration: maxDuration,
      vus: 4,
      iterations: 6200, // 5 * 20 * 62 (from previous jmeter tests)
      exec: "individuallyRetrieveSecrets",
      gracefulStop
    },
    individual2: {
      executor: 'per-vu-iterations',
      maxDuration: maxDuration,
      vus: 4,
      iterations: 6200, // 5 * 20 * 62 (from previous jmeter tests)
      exec: "individuallyRetrieveSecrets",
      gracefulStop
    },
    individual3: {
      executor: 'per-vu-iterations',
      maxDuration: maxDuration,
      vus: 1,
      iterations: 1240, // 20 * 62 (from previous jmeter tests)
      exec: "individuallyRetrieveSecrets",
      gracefulStop
    },
    individual4: {
      executor: 'per-vu-iterations',
      maxDuration: maxDuration,
      vus: 1,
      iterations: 1240, // 20 * 62 (from previous jmeter tests)
      exec: "individuallyRetrieveSecrets",
      gracefulStop
    },
    batch_2_secrets_1: {
      executor: 'per-vu-iterations',
      maxDuration: maxDuration,
      vus: 1,
      iterations: 1240, // 20 * 62 (from previous jmeter tests)
      exec: "batchRetrieveTwoSecrets",
      gracefulStop
    },
    batch_2_secrets_2: {
      executor: 'per-vu-iterations',
      maxDuration: maxDuration,
      vus: 1,
      iterations: 1240, // 20 * 62 (from previous jmeter tests)
      exec: "batchRetrieveTwoSecrets",
      gracefulStop
    },
    batch_2_secrets_3: {
      executor: 'per-vu-iterations',
      maxDuration: maxDuration,
      vus: 3,
      iterations: 6200, // 5 * 20 * 62 (from previous jmeter tests)
      exec: "batchRetrieveTwoSecrets",
      gracefulStop
    },
    batch_2_secrets_4: {
      executor: 'per-vu-iterations',
      maxDuration: maxDuration,
      vus: 3,
      iterations: 6200, // 5 * 20 * 62 (from previous jmeter tests)
      exec: "batchRetrieveTwoSecrets",
      gracefulStop
    },
    batch_4_secrets_1: {
      executor: 'per-vu-iterations',
      maxDuration: maxDuration,
      vus: 1,
      iterations: 1240, // 20 * 62 (from previous jmeter tests)
      exec: "batchRetrieveFourSecrets",
      gracefulStop
    },
    batch_4_secrets_2: {
      executor: 'per-vu-iterations',
      maxDuration: maxDuration,
      vus: 1,
      iterations: 1240, // 20 * 62 (from previous jmeter tests)
      exec: "batchRetrieveFourSecrets",
      gracefulStop
    },
    batch_4_secrets_3: {
      executor: 'per-vu-iterations',
      maxDuration: maxDuration,
      vus: 3,
      iterations: 6200, // 5 * 20 * 62 (from previous jmeter tests)
      exec: "batchRetrieveFourSecrets",
      gracefulStop
    },
    batch_4_secrets_4: {
      executor: 'per-vu-iterations',
      maxDuration: maxDuration,
      vus: 3,
      iterations: 6200, // 5 * 20 * 62 (from previous jmeter tests)
      exec: "batchRetrieveFourSecrets",
      gracefulStop
    },
  }, thresholds: {
    // TODO: To be set later after benchmark tests are fully refactored
    // http_reqs: ['rate > 75']
    // checks: ['rate == 1.0']
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
      const secretIdentity = item.resource_id.replace(`demo:variable:`, '');
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
  const lobsPolicyRes = conjurApi.loadPolicy(
    http,
    env,
    policyId,
    policyContent
  );

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

export function individuallyRetrieveSecrets() {
  if (__ITER === 0) {
    env.applianceUrl = env.applianceReadUrl
    authn();
  }
  let now = new Date()
  // if 6 minutes elapsed, renew authentication
  if (now.getTime() - start.getTime() > 360000) {
    start.setTime(now.getTime())
    authn();
  }
  const identity = `production/myapp/database/username`
  const res = conjurApi.readSecret(http, env, identity);

  readSecretsIndividuallyTrend.add(res.timings.duration);
  readSecretsIndividuallyFailRate.add(res.status !== 200);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "status is not 404": (r) => r.status !== 404,
    "status is not 401": (r) => r.status !== 401,
    "status is not 500": (r) => r.status !== 500
  });
}

export function batchRetrieveTwoSecrets() {
  if (__ITER === 0) {
    env.applianceUrl = env.applianceReadUrl
    authn();
  }
  let now = new Date()
  // if 6 minutes elapsed, renew authentication
  if (now.getTime() - start.getTime() > 360000) {
    start.setTime(now.getTime())
    authn();
  }
  const path = `/secrets?variable_ids=${env.conjurAccount}:variable:production%2Fmyapp%2Fdatabase%2Fusername`
  const res = conjurApi.get(http, env, path);

  readTwoSecretsBatchTrend.add(res.timings.duration);
  readTwoSecretsBatchFailRate.add(res.status !== 200);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "status is not 404": (r) => r.status !== 404,
    "status is not 401": (r) => r.status !== 401,
    "status is not 500": (r) => r.status !== 500
  });
}

export function batchRetrieveFourSecrets() {
  if (__ITER === 0) {
    env.applianceUrl = env.applianceReadUrl
    authn();
  }
  let now = new Date()
  // if 6 minutes elapsed, renew authentication
  if (now.getTime() - start.getTime() > 360000) {
    start.setTime(now.getTime())
    authn();
  }
  const path = `/secrets?variable_ids=${env.conjurAccount}:variable:production%2Fmyapp%2Fdatabase%2Fusername,${env.conjurAccount}:variable:production%2Fmyapp%2Fdatabase%2Fpassword,${env.conjurAccount}:variable:production%2Fmyapp%2Fdatabase%2Fport,${env.conjurAccount}:variable:production%2Fmyapp%2Fdatabase%2Furl`
  const res = conjurApi.get(http, env, path);

  readFourSecretsBatchTrend.add(res.timings.duration);
  readFourSecretsBatchFailRate.add(res.status !== 200);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "status is not 404": (r) => r.status !== 404,
    "status is not 401": (r) => r.status !== 401,
    "status is not 500": (r) => r.status !== 500
  });
}
export function handleSummary(data) {
  // retrieve values from the data object

  const http_req_failed = data['metrics']['http_req_failed']['values']['rate'] * 100
  const http_req_failed_get_two_secret_batch = data['metrics']['http_req_failed_get_two_secrets_batch']['values']['rate'] * 100
  const http_req_failed_get_four_secret_batch = data['metrics']['http_req_failed_get_four_secrets_batch']['values']['rate'] * 100
  const http_req_failed_get_secrets_individually = data['metrics']['http_req_failed_get_secrets_individually']['values']['rate'] * 100
  const http_req_failed_post_authn = data['metrics']['http_req_failed_post_authn']['values']['rate'] * 100
  const http_reqs = data['metrics']['http_reqs']['values']['rate']

  // create a csv data
  const csv = papaparse.unparse([
    ['http_req_failed [%]', 'http_req_failed_get_two_secret_batch [%]', 'http_req_failed_get_four_secret_batch [%]', 'http_req_failed_get_secrets_individually [%]', 'http_req_failed_post_authn [%]', 'http_reqs [req/s]'],
    [http_req_failed, http_req_failed_get_two_secret_batch, http_req_failed_get_four_secret_batch, http_req_failed_get_secrets_individually, http_req_failed_post_authn, http_reqs]
  ]);

  // generate summary as default
  return {
    './tools/performance-tests/k6/reports/metrics.csv': csv,
    stdout: textSummary(data, { indent: " ", enableColors: true }), //the default data object
  };
}
