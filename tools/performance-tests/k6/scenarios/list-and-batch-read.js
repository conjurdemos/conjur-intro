/**
 * This is to imitate External Secrets Operator's FindByName and FindByTag features,
 * where a list of secrets is fetched using pagination, and matching secrets are
 * fetched using the batch endpoint.
 */

import http from "k6/http";
import { check } from "k6";
import exec from 'k6/execution';
import { Trend, Rate } from 'k6/metrics';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";
import papaparse from "../modules/papaparse.min.js";
import { SharedArray } from 'k6/data';
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
const listAndBatchReadTrend = new Trend('http_req_duration_list_and_batch_read', true);
const listAndBatchReadFailRate = new Rate('http_req_failed_list_and_batch_read');

lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = lib.getEnvVar("K6_CUSTOM_GRACEFUL_STOP");
const vus = lib.getEnvVar("K6_CUSTOM_VUS")

const env = lib.parseEnv();

const apiKeys = new SharedArray('ApiKeys', function () {
  return papaparse.parse(open("../data/api-keys.csv"), { header: true }).data;
});

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    list_and_batch: {
      executor: 'shared-iterations',
      maxDuration: "3h",
      vus: vus,
      iterations: 500,
      gracefulStop
    },
  }, thresholds: {
    // TODO: To be set later after benchmark tests are fully refactored
    // http_reqs: ['rate > 75']
    // checks: ['rate == 1.0']
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
  const apiKey = apiKeys.at(exec.vu.idInTest - 1);

  env.applianceUrl = env.applianceReadUrl
  env.conjurIdentity = `host/AutomationVault-hosts/${apiKey.lob_name}/${apiKey.safe_name}/host-1`;
  env.apiKey = apiKey.api_key;

  authn()

  // Fetch all secrets, in pages of 100
  const limit = 100;
  var offset = 0;

  var filteredSecrets = [];

  while (true) {
    const page = conjurApi.list(http, env, limit, offset);
    if (page.status !== 200) {
      listAndBatchReadFailRate.add(true);
      break;
    }

    const secrets = JSON.parse(page.body);

    // Add all secrets to the list
    // This is where filtering would happen. For simplicity, we just add all secrets
    // and only fetch the first x number of secrets in the next step.
    for (const secret of secrets) {
      filteredSecrets.push(secret.id);
    }

    // Check if this is the last page
    if (secrets.length < 100) {
      break;
    }

    // Move to the next page
    offset += limit;
  }

  // Fetch the first x number of secrets
  const maxSecrets = 20;
  var path = "/secrets?variable_ids=";
  for (var i = 0; i < maxSecrets && i < filteredSecrets.length; i++) {
    path += encodeURIComponent(filteredSecrets[i]) + ",";
  }
  path = path.slice(0, -1);
  const res = conjurApi.get(http, env, path);

  listAndBatchReadTrend.add(res.timings.duration);
  listAndBatchReadFailRate.add(res.status !== 200);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "status is not 404": (r) => r.status !== 404,
    "status is not 401": (r) => r.status !== 401,
    "status is not 500": (r) => r.status !== 500
  });

  if (res.status !== 200) {
    console.log(res.body);
  }
}

export function handleSummary(data) {
  return {
    "./tools/performance-tests/k6/reports/list-and-batch-read-summary.html": htmlReport(data, { title: "List and Batch Read Secrets " + new Date().toISOString().slice(0, 16).replace('T', ' ') }),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
