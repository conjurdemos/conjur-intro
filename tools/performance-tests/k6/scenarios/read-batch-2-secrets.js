import http from "k6/http";
import {check} from "k6";
import exec from 'k6/execution';
import {Trend, Rate} from 'k6/metrics';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";
import papaparse from "../modules/papaparse.min.js";
import {SharedArray} from 'k6/data';
import {htmlReport} from "https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js";
import {textSummary} from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import {retrieveApiKey} from "../modules/lib.js";

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
const readTwoSecretsBatchTrend = new Trend('http_req_duration_get_two_secrets_batch', true);
const readTwoSecretsBatchFailRate = new Rate('http_req_failed_get_two_secrets_batch');

lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = lib.getEnvVar("K6_CUSTOM_GRACEFUL_STOP");
const vus = lib.getEnvVar("K6_CUSTOM_VUS")
const iterations = lib.getEnvVar("K6_CUSTOM_ITERATIONS")
const desired_lob = lib.getEnvVar("DESIRED_LOB");
const desired_safe = lib.getEnvVar("DESIRED_SAFE");

const env = lib.parseEnv();

const apiKeys = new SharedArray('ApiKeys', function () {
  return papaparse.parse(open("../data/api-keys.csv"), {header: true}).data;
});

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    batch_2_secrets: {
      executor: 'shared-iterations',
      maxDuration: "3h",
      vus: vus,
      iterations: iterations,
      gracefulStop
    },
  }, thresholds: {
    iterations: ['rate > 85'],
    checks: ['rate == 1.0']
  }
};

export function setup() {
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
  const apiKey = retrieveApiKey(apiKeys, exec.vu.idInTest - 1, desired_lob, desired_safe);
  const uuid = env.uuid

  let uuid_suffix = '';
  if (uuid) {
    uuid_suffix = `-${uuid}`
  }

  env.applianceUrl = env.applianceReadUrl
  env.conjurIdentity = `host/AutomationVault-hosts/${apiKey.lob_name}/${apiKey.safe_name}/host-1${uuid_suffix}`;
  env.apiKey = apiKey.api_key;

  authn()

  // This magic number is tightly coupled with number of accounts in a default backup used in load tests.
  // It should be parametrized when dealing with running multiple load tests with different data
  const accountNumber = Math.ceil(Math.random() * 200) || 1;
  // Randomize one of 5 secrets to read
  const variableNumber = Math.ceil(Math.random() * 5) || 1;
  const identity = encodeURIComponent(`AutomationVault/${apiKey.lob_name}/${apiKey.safe_name}/account-${accountNumber}${uuid_suffix}`);
  const conjurAccount = env.conjurAccount;

  const path = `/secrets?variable_ids=${conjurAccount}:variable:${identity}%2Fvariable-${(variableNumber)%5+1}${uuid_suffix},${conjurAccount}:variable:${identity}%2Fvariable-${(variableNumber+1)%5+1}${uuid_suffix}`
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

export function handleSummary(data) {
  const {
    iterations: {
      values: {rate: httpReqs}
    },
    http_req_duration_get_two_secrets_batch: {
      values: {avg: avgResponseTime, max: maxResponseTime, min: minResponseTime}
    },
    http_req_failed: {
      values: {rate: failRate}
    },
    vus_max: {
      values: {max: vusMax}
    }
  } = data['metrics'];

  const testName = "Retrieve 2 batch secrets";
  const nodeType = lib.checkNodeType(env.applianceReadUrl);

  const csv = papaparse.unparse(
    lib.generateMetricsArray(nodeType, testName, vusMax, httpReqs, avgResponseTime, maxResponseTime, minResponseTime, failRate)
  );

  return {
    "./tools/performance-tests/k6/reports/metrics.csv": csv,
    "./tools/performance-tests/k6/reports/read-batch-2-secrets-summary.html": htmlReport(data, {title: "Read Batch 2 Secrets " + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, {indent: " ", enableColors: true}),
  };
}
