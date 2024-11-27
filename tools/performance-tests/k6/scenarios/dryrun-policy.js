import http from "k6/http";
import {check} from "k6";
import {Counter, Trend, Rate} from 'k6/metrics';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";
import {htmlReport} from "https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js";
import {textSummary} from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import papaparse from "../modules/papaparse.min.js";

/**
 *  Init stage
 */
const requiredEnvVars = [
  "K6_CUSTOM_GRACEFUL_STOP",
  "POLICY_ID"
];

// These are custom k6 metrics that will be reported in the k6 summary.
const authenticateTrend = new Trend('http_req_duration_post_authn', true);
const authenticateFailRate = new Rate('http_req_failed_post_authn');
const dryrunReplacePolicyTrend = new Trend('http_req_duration_dryrun_replace_policy', true);
const dryrunReplacePolicyCount = new Counter('iterations_dryrun_replace_policy');
const dryrunReplacePolicyFailRate = new Rate('http_req_failed_dryrun_replace_policy');

lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = '5m'
const executor = lib.getEnvVar("DRYRUN_POLICY_EXECUTOR")
const policyContentsSize = lib.getEnvVar("POLICY_CONTENTS_SIZE")
const policyId = lib.getEnvVar("POLICY_ID")
const vus = lib.getEnvVar("K6_CUSTOM_VUS")
const iterations = lib.getEnvVar("DRYRUN_ITERATIONS")

const env = lib.parseEnv();

let policyContents = open(`/tools/performance-tests/k6/data/policy/test-${policyContentsSize}.yml`);
let policyPreDataContents = open(`/tools/performance-tests/k6/data/policy/pre-data-${policyContentsSize}.yml`);

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
let scenarios, thresholds;

if (executor === 'constant-vus') {
  scenarios = {
    dryrun_replace_policy: {
      duration: '5m',
      executor: executor,
      vus: vus,
      gracefulStop
    },
  };
  thresholds = {
    checks: ['rate == 1.0']
  };
} else {
  scenarios = {
    dryrun_replace_policy: {
      executor: executor,
      vus: 1,
      iterations: iterations,
      gracefulStop,
      maxDuration: '1h'
    },
  };
  thresholds = {
    checks: ['rate == 1.0']
  };
}

export const options = {
  scenarios: scenarios,
  thresholds: thresholds
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


export default function (data) {
  env.applianceUrl = env.applianceMasterUrl
  authn();

  const dryrunReplacePolicyRes = conjurApi.replacePolicy(
    http,
    env,
    policyId,
    policyContents,
    true
  );
  dryrunReplacePolicyTrend.add(data.preLoadPolicyRes.timings.duration + dryrunReplacePolicyRes.timings.duration);
  dryrunReplacePolicyCount.add(1);
  dryrunReplacePolicyFailRate.add(dryrunReplacePolicyRes.status !== 201 && dryrunReplacePolicyRes.status !== 200 && data.preLoadPolicyRes.status !== 201);

  check(dryrunReplacePolicyRes, {
    "status is 200 or 201": (r) => r.status === 200 || r.status === 201,
    "status is not 500": (r) => r.status !== 500
  });
}

export function setup() {
  const preLoadPolicyRes = conjurApi.loadPolicy(
    http,
    env,
    policyId,
    policyPreDataContents,
  );
  console.log('pre load policy time duration: ' + preLoadPolicyRes.timings.duration + 's' );
  return { preLoadPolicyRes };
}

export function handleSummary(data) {
  const {
    iterations_dryrun_replace_policy: {
      values: {rate: httpReqs}
    },
    http_req_duration_dryrun_replace_policy: {
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

  const testName = "Dry-Run Replace a policy";
  const nodeType = lib.checkNodeType(env.applianceMasterUrl);

  const csv = papaparse.unparse(
    lib.generateMetricsArray(nodeType, testName, vusMax, httpReqs, avgResponseTime, maxResponseTime, minResponseTime)
  );

  return {
    "./tools/performance-tests/k6/reports/metrics.csv": csv,
    "./tools/performance-tests/k6/reports/dryrun-policy-summary.html": htmlReport(data, {title: "Dry-Run Policy " + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, {indent: " ", enableColors: true}),
  };
}
