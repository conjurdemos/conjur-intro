import http from "k6/http";
import {check} from "k6";
import exec from 'k6/execution';
import {Trend, Rate, Counter} from 'k6/metrics';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";

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

const successfulIterations = new Counter("Max Policy Depth");

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    policy_depth: {
      executor: 'shared-iterations',
      maxDuration: "1h",
      vus: 1,
      iterations: 500,
      gracefulStop
    },
  },
  thresholds: {
    "Max Policy Depth": ["count>400"]
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

  const policyRes = conjurApi.loadPolicy(
    http,
    env,
    "root",
    policyContent
  );

  console.log("RESPONSE BODY START", policyRes.body, "RESPONSE BODY END")

  if (check(policyRes, {"Status is 201": (r) => r.status === 201})) {
    successfulIterations.add(1);
  }
}