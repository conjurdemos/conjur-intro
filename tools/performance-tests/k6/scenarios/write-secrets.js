import http from "k6/http";
import {check} from "k6";
import exec from 'k6/execution';
import {Trend, Rate} from 'k6/metrics';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";
import papaparse from "../modules/papaparse.min.js";
import {SharedArray} from 'k6/data';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

/**
 *  Init stage
 */
const requiredEnvVars = [
  "K6_CUSTOM_GRACEFUL_STOP",
  "K6_CUSTOM_VUS"
];

// These are custom k6 metrics that will be reported in the k6 summary.
const authenticateTrend = new Trend('http_req_duration_post_authn', true);
const authenticateFailRate = new Rate('http_req_failed_post_authn');
const writeSecretsTrend = new Trend('http_req_duration_write_secrets', true);
const writeSecretsFailRate = new Rate('http_req_failed_write_secrets');

lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = lib.getEnvVar("K6_CUSTOM_GRACEFUL_STOP");
const vus = lib.getEnvVar("K6_CUSTOM_VUS")

const env = lib.parseEnv();

const writeSecretsData = new SharedArray('WriteSecrets', function () {
  // Load CSV file and parse it using Papa Parse
  return papaparse.parse(open("../data/test-variable-secrets.csv"), {header: true, skipEmptyLines: true}).data;
});

const testVariablePolicy = open("../data/policy/test-variable.yml");

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    write_secrets: {
      executor: 'shared-iterations',
      maxDuration: "1h",
      vus: vus,
      iterations: writeSecretsData.length,
      gracefulStop
    },
  }, thresholds: {
    // TODO: To be set later after benchmark tests are fully refactored
    // http_reqs: ['rate > 75']
    // checks: ['rate == 1.0']
  }
};

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

  env.token = res.body;
}

export default function () {
  env.applianceUrl = env.applianceMasterUrl
  authn();
  const variable = writeSecretsData[exec.scenario.iterationInTest];
  const resourceId = encodeURIComponent(variable.resource_id);
  const resourceBody = variable.resource_body;

  const response = conjurApi.writeSecret(
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


export function handleSummary(data) {
  return {
    "./tools/performance-tests/k6/reports/write-secrets-summary.html": htmlReport(data, {title: "Write Secrets " + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
