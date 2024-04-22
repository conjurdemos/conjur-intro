import http from "k6/http";
import {check} from "k6";
import {Trend, Rate} from 'k6/metrics';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";
import {SharedArray} from 'k6/data';
import papaparse from "../modules/papaparse.min.js";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

/**
 *  Init stage
 */
const requiredEnvVars = [
  "K6_CUSTOM_GRACEFUL_STOP"
];

// These are custom k6 metrics that will be reported in the k6 summary.
const authenticateTrend = new Trend('http_req_duration_post_authn', true);
const authenticateFailRate = new Rate('http_req_failed_post_authn');
const readFourSecretsBatchTrend = new Trend('http_req_duration_get_four_secrets_batch', true);
const readFourSecretsBatchFailRate = new Rate('http_req_failed_get_four_secrets_batch');

lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = lib.getEnvVar("K6_CUSTOM_GRACEFUL_STOP");

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

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    batch_4_secrets_1: {
      executor: 'per-vu-iterations',
      maxDuration: "3h",
      vus: 5,
      iterations: 6200, // 5 * 20 * 62 (from previous jmeter tests)
      gracefulStop
    },
    batch_4_secrets_2: {
      executor: 'per-vu-iterations',
      maxDuration: "3h",
      vus: 5,
      iterations: 6200, // 5 * 20 * 62 (from previous jmeter tests)
      gracefulStop
    },
    batch_4_secrets_3: {
      executor: 'per-vu-iterations',
      maxDuration: "3h",
      vus: 1,
      iterations: 1240, // 20 * 62 (from previous jmeter tests)
      gracefulStop
    },
    batch_4_secrets_4: {
      executor: 'per-vu-iterations',
      maxDuration: "3h",
      vus: 1,
      iterations: 1240, // 20 * 62 (from previous jmeter tests)
      gracefulStop
    },
  }, thresholds: {
    // TODO: To be set later after benchmark tests are fully refactored
    // http_reqs: ['rate > 75']
    // checks: ['rate == 1.0']
  }
};

function loadSecrets() {
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
      check(responses[i], {
        "status is 201": (r) => r.status === 200 || r.status === 201,
      });
    }

    // dump the reqs for the next iteration
    reqs = [];
  }
}

function loadPolicy(policyContent, policyId) {
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

  env.token = res.body;
}

export default function () {
  env.applianceUrl = env.applianceReadUrl
  authn();
  const path = `/secrets?variable_ids=demo:variable:production%2Fmyapp%2Fdatabase%2Fusername,demo:variable:production%2Fmyapp%2Fdatabase%2Fpassword,demo:variable:production%2Fmyapp%2Fdatabase%2Fport,demo:variable:production%2Fmyapp%2Fdatabase%2Furl`
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
  return {
    "./tools/performance-tests/k6/reports/read-batch-4-secrets-summary.html": htmlReport(data, {title: "Read Batch 4 Secrets " + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
