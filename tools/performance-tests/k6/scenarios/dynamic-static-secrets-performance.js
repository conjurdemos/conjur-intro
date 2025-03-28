import http from "k6/http";
import {check} from "k6";
import {Counter, Trend, Rate} from 'k6/metrics';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";
import papaparse from "../modules/papaparse.min.js";
import {htmlReport} from "https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js";
import {textSummary} from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

/**
 *  Init stage
 */
const requiredEnvVars = [
  "K6_CUSTOM_GRACEFUL_STOP",
  "PERF_TEST_DYNAMIC_SECRETS_AWS_ACCESS_KEY_ID",
  "PERF_TEST_DYNAMIC_SECRETS_AWS_SECRET_ACCESS_KEY",
  "PERF_TEST_DYNAMIC_SECRETS_AWS_ASSUME_ROLE_ARN",
];

// These are custom k6 metrics that will be reported in the k6 summary.
const authenticateTrend = new Trend('http_req_duration_post_authn', true);
const authenticateFailRate = new Rate('http_req_failed_post_authn');
const createStaticSecretsPolicyTrend = new Trend('http_req_duration_create_static_secrets_policy', true);
const createStaticSecretsPolicyFailRate = new Rate('http_req_failed_create_static_secrets_policy');
const staticSecretsCount = new Counter('iterations_static_secrets_count');
const writeStaticSecretsTrend = new Trend('http_req_duration_write_static_secrets', true);
const writeStaticSecretsFailRate = new Rate('http_req_failed_write_static_secrets');
const readStaticSecretsTrend = new Trend('http_req_duration_read_static_secrets', true);
const readStaticSecretsFailRate = new Rate('http_req_failed_read_static_secrets');
const dynamicSecretsCount = new Counter('iterations_dynamic_secrets_count');
const readDynamicSecretsTrend = new Trend('http_req_duration_read_dynamic_secrets', true);
const readDynamicSecretsFailRate = new Rate('http_req_failed_read_dynamic_secrets');
const createDynamicSecretsPolicyTrend = new Trend('http_req_duration_create_dynamic_secrets_policy', true);
const createDynamicSecretsPolicyFailRate = new Rate('http_req_failed_create_dynamic_secrets_policy');
const createAwsIssuerTrend = new Trend('http_req_duration_create_aws_issuer', true);
const createAwsIssuerFailRate = new Rate('http_req_failed_create_aws_issuer');

const secret = '/ds-assume-role'
let uniqueIdentifierPrefix = Math.random().toString(36).slice(2, 12);

lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = lib.getEnvVar("K6_CUSTOM_GRACEFUL_STOP");

const env = lib.parseEnv();

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    individual: {
      executor: 'shared-iterations',
      maxDuration: "3h",
      vus: 1,
      iterations: 1000,
      gracefulStop
    },
  }, thresholds: {
    iterations: ['rate > 1'],
    checks: ['rate == 1.0']
  }
};

export function setup(){
  env.applianceUrl = env.applianceMasterUrl
  authn();

  // Create the issuer
  let res = conjurApi.createAwsIssuer(
    http,
    env,
    'my-aws',
    env.perfTestDynamicSecretsAwsAccessKeyId,
    env.perfTestDynamicSecretsAwsSecretAccessKey
  );

  createAwsIssuerTrend.add(res.timings.duration);
  // Subsequent iterations will fail with a 409 if the issuer already exists,
  // and that would be expected.
  createAwsIssuerFailRate.add(res.status !== 201 && res.status !== 409);
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
  authn()
  let identifier = uniqueIdentifierPrefix + `${__VU}-${__ITER}`;
  const {policyId} = env;

  // load static variable policy
  const loadPolicyStaticSecretsResponse = conjurApi.loadPolicy(
    http,
    env,
    policyId,
    lib.createStaticSecretsPolicy(identifier)
  );

  createStaticSecretsPolicyTrend.add(loadPolicyStaticSecretsResponse.timings.duration);
  createStaticSecretsPolicyFailRate.add(loadPolicyStaticSecretsResponse.status !== 201);

  check(loadPolicyStaticSecretsResponse, {
    "status is 201": (r) => r.status === 201,
    "status is not 500": (r) => r.status !== 500
  });

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

  staticSecretsCount.add(1);
  writeStaticSecretsTrend.add(writeStaticSecretResponse.timings.duration);
  writeStaticSecretsFailRate.add(writeStaticSecretResponse.status !== 201 && writeStaticSecretResponse.status !== 201);

  // read static variable
  const readStaticSecretResponse = conjurApi.readSecret(http, env, identifier + secret);

  readStaticSecretsTrend.add(readStaticSecretResponse.timings.duration);
  readStaticSecretsFailRate.add(readStaticSecretResponse.status !== 200);

  check(readStaticSecretResponse, {
    "status is 200": (r) => r.status === 200,
    "status is not 404": (r) => r.status !== 404,
    "status is not 401": (r) => r.status !== 401,
    "status is not 500": (r) => r.status !== 500
  });

  // load dynamic variable policy
  identifier = '/' + identifier
  const loadPolicyDynamicSecretsPolicyResponse = conjurApi.loadPolicy(
    http,
    env,
    policyId,
    lib.createDynamicSecretsPolicy(env.perfTestDynamicSecretsAwsAssumeRoleArn, identifier)
  );

  createDynamicSecretsPolicyTrend.add(loadPolicyDynamicSecretsPolicyResponse.timings.duration);
  createDynamicSecretsPolicyFailRate.add(loadPolicyDynamicSecretsPolicyResponse.status !== 201);

  check(loadPolicyDynamicSecretsPolicyResponse, {
    "status is 201": (r) => r.status === 201,
    "status is not 500": (r) => r.status !== 500
  });

  dynamicSecretsCount.add(1);

  // Read dynamic secret
  const readDynamicSecretResponse = conjurApi.readSecret(http, env, 'data/dynamic' + identifier + secret);

  readDynamicSecretsTrend.add(readDynamicSecretResponse.timings.duration);
  readDynamicSecretsFailRate.add(readDynamicSecretResponse.status !== 200);

  check(readDynamicSecretResponse, {
    "status is 200": (r) => r.status === 200,
    "status is not 404": (r) => r.status !== 404,
    "status is not 401": (r) => r.status !== 401,
    "status is not 500": (r) => r.status !== 500
  });
}

export function handleSummary(data) {
  const {
    iterations_static_secrets_count: {
      values: {rate: httpReqsStaticSecret}
    },
    iterations_dynamic_secrets_count: {
      values: {rate: httpReqsDynamicSecret}
    },
    http_req_duration_read_static_secrets: {
      values: {avg: avgResponseTimeReadStatic, max: maxResponseTimeReadStatic, min: minResponseTimeReadStatic}
    },
    http_req_duration_write_static_secrets: {
      values: {avg: avgResponseTimeWriteStatic, max: maxResponseTimeWriteStatic, min: minResponseTimeWriteStatic}
    },
    http_req_duration_read_dynamic_secrets: {
      values: {avg: avgResponseTimeReadDynamic, max: maxResponseTimeReadDynamic, min: minResponseTimeReadDynamic}
    },
    http_req_failed: {
      values: {rate: failRate}
    },
    vus_max: {
      values: {max: vusMax}
    }
  } = data['metrics'];

  const testName = "Store and retrieve static and dynamic secrets";
  const nodeType = lib.checkNodeType(env.applianceReadUrl);

  const csv = papaparse.unparse(
    lib.generateMetricsArray(nodeType, testName, vusMax, httpReqsStaticSecret, avgResponseTimeReadStatic, maxResponseTimeReadStatic, minResponseTimeReadStatic, httpReqsDynamicSecret, avgResponseTimeWriteStatic, maxResponseTimeWriteStatic, minResponseTimeWriteStatic, avgResponseTimeReadDynamic, maxResponseTimeReadDynamic, minResponseTimeReadDynamic, failRate)
  );

  return {
    "./tools/performance-tests/k6/reports/metrics.csv": csv,
    "./tools/performance-tests/k6/reports/static-dynamic-secrets-performance-summary.html": htmlReport(data, {title: "Static And Dynamic Secrets Performance" + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, {indent: " ", enableColors: true}),
  };
}
