import http from "k6/http";
import {check} from "k6";
import exec from 'k6/execution';
import {Trend, Rate} from 'k6/metrics';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";
import {SharedArray} from 'k6/data';
import papaparse from "../modules/papaparse.min.js";
import {htmlReport} from "https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js";
import {textSummary} from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

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

const apiKeys = new SharedArray('ApiKeys', function () {
  return papaparse.parse(open("../data/api-keys.csv"), {header: true}).data;
});

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    batch_4_secrets: {
      executor: 'shared-iterations',
      maxDuration: "3h",
      vus: 12,
      iterations: 64500,
      gracefulStop
    },
  }, thresholds: {
    iterations: ['rate > 75'],
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
  const apiKey = apiKeys.at(exec.vu.idInTest - 1);
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
  const identity = encodeURIComponent(`AutomationVault/${apiKey.lob_name}/${apiKey.safe_name}/account-${accountNumber}${uuid_suffix}`);

  const path = `/secrets?variable_ids=demo:variable:${identity}%2Fvariable-1${uuid_suffix},demo:variable:${identity}%2Fvariable-2${uuid_suffix},demo:variable:${identity}%2Fvariable-3${uuid_suffix},demo:variable:${identity}%2Fvariable-4${uuid_suffix}`
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
  const {
    iterations: {
      values: {rate: httpReqs}
    },
    http_req_duration_get_four_secrets_batch: {
      values: {avg: avgResponseTime, max: maxResponseTime, min: minResponseTime}
    },
    vus_max: {
      values: {max: vusMax}
    }
  } = data['metrics'];

  const testName = "Retrieve 4 batch secrets";
  const nodeType = lib.checkNodeType(env.applianceReadUrl);

  const csv = papaparse.unparse(
    lib.generateMetricsArray(nodeType, testName, vusMax, httpReqs, avgResponseTime, maxResponseTime, minResponseTime)
  );

  return {
    "./tools/performance-tests/k6/reports/metrics.csv": csv,
    "./tools/performance-tests/k6/reports/read-batch-4-secrets-summary.html": htmlReport(data, {title: "Read Batch 4 Secrets " + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, {indent: " ", enableColors: true}),
  };
}
