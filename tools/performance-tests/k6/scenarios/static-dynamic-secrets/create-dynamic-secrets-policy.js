import http from "k6/http";
import {check} from "k6";
import {Trend, Rate} from 'k6/metrics';
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
const createDynamicSecretsPolicyTrend = new Trend('http_req_duration_create_dynamic_secrets_policy', true);
const createDynamicSecretsPolicyFailRate = new Rate('http_req_failed_create_dynamic_secrets_policy');
const createAwsIssuerTrend = new Trend('http_req_duration_create_aws_issuer', true);
const createAwsIssuerFailRate = new Rate('http_req_failed_create_aws_issuer');

lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = lib.getEnvVar("K6_CUSTOM_GRACEFUL_STOP");
const vus = lib.getEnvVar("K6_CUSTOM_VUS");
const iterations = Math.ceil(1000 / lib.getEnvVar("K6_CUSTOM_VUS"))
const env = lib.parseEnv();

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    individual: {
      executor: 'per-vu-iterations',
      maxDuration: "3h",
      vus: 1,
      iterations: vus,
      gracefulStop
    },
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
  const {policyId} = env;
  const {uniqueIdentifierPrefix} = env;
  let identifier = (uniqueIdentifierPrefix || '') + `${__ITER + 1}`

  // load dynamic variable policy
  const loadPolicyDynamicSecretsResponse = conjurApi.loadPolicy(
    http,
    env,
    policyId,
    lib.createBulkDynamicSecretsPolicy(env.perfTestDynamicSecretsAwsAssumeRoleArn, identifier, iterations)
  );

  if(loadPolicyDynamicSecretsResponse.status == 201 ){
    createDynamicSecretsPolicyTrend.add(loadPolicyDynamicSecretsResponse.timings.duration);
  }
  // Subsequent iterations will fail with a 409 if the policy is in progress,
  // and that would be expected.
  createDynamicSecretsPolicyFailRate.add(loadPolicyDynamicSecretsResponse.status !== 201 && loadPolicyDynamicSecretsResponse.status !== 409);

  check(loadPolicyDynamicSecretsResponse, {
    "status is 201 or 409": (r) => r.status === 201 || r.status === 409,
    "status is not 500": (r) => r.status !== 500
  });
}

export function handleSummary(data) {
  const {
    iterations: {
      values: {rate: httpReqs}
    },
    http_req_duration_create_dynamic_secrets_policy: {
      values: {avg: avgResponseTime, max: maxResponseTime, min: minResponseTime}
    },
    http_req_failed: {
      values: {rate: failRate}
    },
    vus_max: {
      values: {max: vusMax}
    }
  } = data['metrics'];


  const testName = "Create Dynamic Secrets Policy";
  const nodeType = lib.checkNodeType(env.applianceMasterUrl);

  const csv = papaparse.unparse(
    lib.generateMetricsArray(nodeType, testName, vusMax, httpReqs, avgResponseTime, maxResponseTime, minResponseTime, failRate)
  );

  return {
    "./tools/performance-tests/k6/reports/metrics.csv": csv,
    "./tools/performance-tests/k6/reports/create-dynamic-secrets-policy-summary.html": htmlReport(data, {title: "Create Dynamic Secrets Policy" + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, {indent: " ", enableColors: true}),
  };
}
