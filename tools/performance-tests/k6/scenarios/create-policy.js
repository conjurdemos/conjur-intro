import http from "k6/http";
import {check} from "k6";
import {Trend, Rate} from 'k6/metrics';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";
import {htmlReport} from "https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js";
import {textSummary} from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import papaparse from "../modules/papaparse.min.js";

/**
 *  Init stage
 */
const requiredEnvVars = [
  "K6_CUSTOM_GRACEFUL_STOP"
];

// These are custom k6 metrics that will be reported in the k6 summary.
const authenticateTrend = new Trend('http_req_duration_post_authn', true);
const authenticateFailRate = new Rate('http_req_failed_post_authn');
const createPolicyTrend = new Trend('http_req_duration_create_policy', true);
const createPolicyFailRate = new Rate('http_req_failed_create_policy');

lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = lib.getEnvVar("K6_CUSTOM_GRACEFUL_STOP");

const env = lib.parseEnv();

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    create_policy: {
      executor: 'per-vu-iterations',
      maxDuration: "1h",
      // We can only create one policy at a time (409 Conflict can occur because all policies are loaded into the same root policy)
      vus: 1,
      iterations: 500,
      gracefulStop
    },
  }, thresholds: {
    // TODO: To be set later after benchmark tests are fully refactored
    // http_reqs: ['rate > 75']
    // checks: ['rate == 1.0']
  }
};

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

  // Creates a unique identifier across all VUs and iterations
  const identifier = `${__VU}-${__ITER}-${lib.uuid()}`;
  const {policyId} = env;

  const lobsPolicyRes = conjurApi.loadPolicy(
    http,
    env,
    policyId,
    lib.createLobsPolicy(identifier)
  );
  const hostsPolicyRes = conjurApi.loadPolicy(
    http,
    env,
    policyId,
    lib.createHostsPolicy(identifier)
  );
  const usersPolicyRes = conjurApi.loadPolicy(
    http,
    env,
    policyId,
    lib.createUsersPolicy(identifier)
  );

  createPolicyTrend.add(lobsPolicyRes.timings.duration + hostsPolicyRes.timings.duration + usersPolicyRes.timings.duration);
  createPolicyFailRate.add(lobsPolicyRes.status !== 201 || hostsPolicyRes.status !== 201 || usersPolicyRes.status !== 201);

  check(lobsPolicyRes, {
    "status is 201": (r) => r.status === 201,
    "status is not 500": (r) => r.status !== 500
  });
  check(hostsPolicyRes, {
    "status is 201": (r) => r.status === 201,
    "status is not 500": (r) => r.status !== 500
  });
  check(usersPolicyRes, {
    "status is 201": (r) => r.status === 201,
    "status is not 500": (r) => r.status !== 500
  });
}

export function handleSummary(data) {
  const {
    iterations: {
      values: {rate: httpReqs}
    },
    http_req_duration_create_policy: {
      values: {
        avg: avgResponseTime,
        max: maxResponseTime,
        min: minResponseTime
      }
    },
    vus_max: {
      values: {max: vusMax}
    }
  } = data['metrics'];

  const testName = "Load a policy";
  const nodeType = lib.checkNodeType(env.applianceMasterUrl);

  const csv = papaparse.unparse(
    lib.generateMetricsArray(nodeType, testName, vusMax, httpReqs, avgResponseTime, maxResponseTime, minResponseTime)
  );

  return {
    "./tools/performance-tests/k6/reports/metrics.csv": csv,
    "./tools/performance-tests/k6/reports/create-policy-summary.html": htmlReport(data, {title: "Create Policy " + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, {indent: " ", enableColors: true}),
  };
}
