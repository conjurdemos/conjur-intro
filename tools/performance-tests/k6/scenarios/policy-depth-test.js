import http from "k6/http";
import {check} from "k6";
import exec from 'k6/execution';
import {Trend, Rate, Counter} from 'k6/metrics';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

/**
 *  Init stage
 */
const requiredEnvVars = [
  "K6_CUSTOM_GRACEFUL_STOP",
];

// These are custom k6 metrics that will be reported in the k6 summary.
const authenticateTrend = new Trend('http_req_duration_post_authn', true);
const authenticateFailRate = new Rate('http_req_failed_post_authn');


lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = lib.getEnvVar("K6_CUSTOM_GRACEFUL_STOP");

const env = lib.parseEnv();

const successfulIterations = new Counter("Max_Policy_Depth");

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    policy_depth: {
      executor: 'shared-iterations',
      maxDuration: "1h",
      vus: 1,
      iterations: 150,
      gracefulStop
    },
  },
  thresholds: {
    "Max_Policy_Depth": ["count>100"]
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
  env.applianceUrl = env.applianceMasterUrl
  authn();
  const policyContent = lib.createNestedPolicy(1, exec.scenario.iterationInTest + 1)

  const policyRes = conjurApi.replacePolicy(
    http,
    env,
    "root",
    policyContent
  );

  if (check(policyRes, {"Status is 201": (r) => r.status === 201})) {
    successfulIterations.add(1);
  }
}
export function handleSummary(data) {
  return {
    "./tools/performance-tests/k6/reports/policy-depth-test-summary.html": htmlReport(data, {title: "Test max policy depth " + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
