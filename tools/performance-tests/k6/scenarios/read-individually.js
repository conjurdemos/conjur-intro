import http from "k6/http";
import {check} from "k6";
import exec from 'k6/execution';
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
const readSecretsIndividuallyTrend = new Trend('http_req_duration_get_secrets_individually', true);
const readSecretsIndividuallyFailRate = new Rate('http_req_failed_get_secrets_individually');

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
    individual: {
      executor: 'shared-iterations',
      maxDuration: "3h",
      vus: 12,
      iterations: 64500,
      gracefulStop
    },
  }, thresholds: {
    // TODO: To be set later after benchmark tests are fully refactored
    // http_reqs: ['rate > 75']
    // checks: ['rate == 1.0']
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
  const apiKey = apiKeys.at(exec.vu.idInTest-1);

  env.applianceUrl = env.applianceReadUrl
  env.conjurIdentity = `host/AutomationVault-hosts/${apiKey.lob_name}/${apiKey.safe_name}/host-1`;
  env.apiKey = apiKey.api_key;

  authn()

  // This magic number is tightly coupled with number of accounts in a default backup used in load tests.
  // It should be parametrized when dealing with running multiple load tests with different data
  const accountNumber = Math.ceil(Math.random() * 200) || 1;
  const identity = `AutomationVault/${apiKey.lob_name}/${apiKey.safe_name}/account-${accountNumber}/variable-1`;

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

export function handleSummary(data) {
  return {
    "./tools/performance-tests/k6/reports/read-individually-summary.html": htmlReport(data, {title: "Read Secrets Individually " + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
