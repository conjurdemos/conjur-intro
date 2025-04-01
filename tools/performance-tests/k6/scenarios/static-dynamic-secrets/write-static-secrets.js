import http from "k6/http";
import {check} from "k6";
import {Counter, Trend, Rate} from 'k6/metrics';
import * as conjurApi from "../../modules/api.js";
import * as lib from "../../modules/lib.js";
import papaparse from "../../modules/papaparse.min.js";
import {htmlReport} from "https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js";
import {textSummary} from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

/**
 *  Init stage
 */
const requiredEnvVars = [
  "K6_CUSTOM_VUS",
  "K6_CUSTOM_GRACEFUL_STOP",
];

// These are custom k6 metrics that will be reported in the k6 summary.
const authenticateTrend = new Trend('http_req_duration_post_authn', true);
const authenticateFailRate = new Rate('http_req_failed_post_authn');
const writeStaticSecretsTrend = new Trend('http_req_duration_write_static_secrets', true);
const writeStaticSecretsFailRate = new Rate('http_req_failed_write_static_secrets');
const writeStaticSecretsCount = new Counter('iterations_write_static_secrets_count');

const secret = '/ds-assume-role'

lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = lib.getEnvVar("K6_CUSTOM_GRACEFUL_STOP");
const vus = lib.getEnvVar("K6_CUSTOM_VUS");
const env = lib.parseEnv();
const iterations = Math.ceil(1000 / lib.getEnvVar("K6_CUSTOM_VUS"));

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    individual: {
      executor: 'per-vu-iterations',
      maxDuration: "3h",
      vus: vus,
      iterations: iterations,
      gracefulStop
    },
  }, thresholds: {
    iterations: ['rate > 1'],
    checks: ['rate == 1.0']
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
  authn()
  const {uniqueIdentifierPrefix} = env;
  let identifier = (uniqueIdentifierPrefix || '') + `${__VU}-${__ITER}`

  // write static variable
  const writeStaticSecretResponse = conjurApi.writeSecret(
    http,
    env,
    identifier + secret,
    'secret'
  );

  check(writeStaticSecretResponse, {
    "status is 201": (r) => r.status === 201,
    "status is not 500": (r) => r.status !== 500
  });

  writeStaticSecretsCount.add(1);
  writeStaticSecretsTrend.add(writeStaticSecretResponse.timings.duration);
  writeStaticSecretsFailRate.add(writeStaticSecretResponse.status !== 200 && writeStaticSecretResponse.status !== 201);
}

export function handleSummary(data) {
  const {
    iterations_write_static_secrets_count: {
      values: {rate: httpReqsWriteStaticSecret}
    },
    http_req_duration_write_static_secrets: {
      values: {avg: avgResponseTimeWriteStatic, max: maxResponseTimeWriteStatic, min: minResponseTimeWriteStatic}
    },
    http_req_failed: {
      values: {rate: failRate}
    },
    vus_max: {
      values: {max: vusMax}
    }
  } = data['metrics'];

  const testName = "Create Static Secrets Policy";
  const nodeType = lib.checkNodeType(env.applianceReadUrl);

  const csv = papaparse.unparse(
    lib.generateMetricsArray(nodeType, testName, vusMax, failRate, httpReqsWriteStaticSecret, avgResponseTimeWriteStatic, maxResponseTimeWriteStatic, minResponseTimeWriteStatic)
  );

  return {
    "./tools/performance-tests/k6/reports/metrics.csv": csv,
    "./tools/performance-tests/k6/reports/create-static-secrets-policy-summary.html": htmlReport(data, {title: "Create Static Secrets Policy" + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, {indent: " ", enableColors: true}),
  };
}
