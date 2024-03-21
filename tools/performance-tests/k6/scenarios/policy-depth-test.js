import http from "k6/http";
import {check} from "k6";
import exec from 'k6/execution';
import {Trend, Rate} from 'k6/metrics';
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

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    write_secrets: {
      executor: 'shared-iterations',
      maxDuration: "1h",
      vus: 1,
      iterations: 1000,
      gracefulStop
    },
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

export function loadPolicy(policyContent, policyId) {
  // create policy
  const policyRes = conjurApi.loadPolicy(
    http,
    env,
    policyId,
    policyContent
  );

  console.log("RESPONSE BODY START", policyRes.body, "RESPONSE BODY END")

  // if (!check(policyRes, {
  //   "status is 201": (r) => r.status === 201,
  // })) {
  //   fail("Policy load request failed");
  // }
}

export default function () {
  env.applianceUrl = env.applianceMasterUrl
  authn();
  const policyContent = lib.createNestedPolicy(1, exec.scenario.iterationInTest + 1)
  //const policyContent = lib.createPolicyYaml(1, 289)

  // try {
  //   loadPolicy(policyContent,"root")
  // } catch (error) {
  //   console.log(`Test stopped at iteration ${exec.scenario.iterationInTest} due to an error: ${error}`);
  //   exec.test.abort('API name validation failed');
  // }

  const policyRes = conjurApi.loadPolicy(
    http,
    env,
    "root",
    policyContent
  );

  if (check(policyRes, {"Status is not 201": (r) => r.status !== 201})) {
    //console.log(`Test stopped at iteration ${exec.scenario.iterationInTest} due to an error: ${error}`);
    exec.test.abort('Current max depth of nested policies: ' + exec.scenario.iterationInTest);
    }
  }