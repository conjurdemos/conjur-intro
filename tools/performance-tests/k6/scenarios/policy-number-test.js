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
  "K6_CUSTOM_DURATION"
];

// These are custom k6 metrics that will be reported in the k6 summary.
const authenticateTrend = new Trend('http_req_duration_post_authn', true);
const authenticateFailRate = new Rate('http_req_failed_post_authn');


lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = lib.getEnvVar("K6_CUSTOM_GRACEFUL_STOP");
const testDuration = lib.getEnvVar("K6_CUSTOM_DURATION");

const env = lib.parseEnv();

const successfulPolicyLoads = new Counter("Max_Policy_Number");

const rootPolicies = open("../data/policy/rootPolicies.yml");
const cleanupPolicy = open("../data/policy/cleanupPolicy.yml");

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    write_secrets: {
      executor: 'constant-vus',
      vus: 5,
      duration: testDuration,
      gracefulStop
    },
  },
  teardownTimeout: '30m'
};

export function loadPolicy(policyContent, policyId) {
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
  authn();
  loadPolicy(rootPolicies, "root")
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

  const policyContent = lib.create1kPolicies((exec.vu.iterationInScenario+1))

  const policyRes = conjurApi.loadPolicy(
    http,
    env,
    `devroot${exec.vu.idInTest}`,
    policyContent
  );

  if (check(policyRes, {"Status is 201": (r) => r.status === 201})) {
    successfulPolicyLoads.add(1000);
  }
}

export function teardown() {
  env.applianceUrl = env.applianceMasterUrl
  authn();
  //Clear root from policy leftovers
  conjurApi.replacePolicy(
    http,
    env,
    "root",
    cleanupPolicy
  );
}

export function handleSummary(data) {
  return {
    "./tools/performance-tests/k6/reports/policy-number-test-summary.html": htmlReport(data, {title: "Test max policy number " + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
