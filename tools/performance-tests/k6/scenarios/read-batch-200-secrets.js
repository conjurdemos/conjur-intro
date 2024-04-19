import http from "k6/http";
import {check} from "k6";
import exec from 'k6/execution';
import {Trend, Rate} from 'k6/metrics';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";
import {SharedArray} from 'k6/data';
import papaparse from "../modules/papaparse.min.js";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

/**
 *  Init stage
 */
const requiredEnvVars = [
  "K6_CUSTOM_GRACEFUL_STOP"
];

// These are custom k6 metrics that will be reported in the k6 summary.
const authenticateTrend = new Trend('http_req_duration_post_authn', true);
const authenticateFailRate = new Rate('http_req_failed_post_authn');
const readtwohundredSecretsBatchTrend = new Trend('http_req_duration_get_twohundred_secrets_batch', true);
const readtwohundredSecretsBatchFailRate = new Rate('http_req_failed_get_twohundred_secrets_batch');

lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = lib.getEnvVar("K6_CUSTOM_GRACEFUL_STOP");

const env = lib.parseEnv();

const apiKeys = new SharedArray('ApiKeys', function () {
  return papaparse.parse(open("../data/api-keys.csv"), {header: true}).data;
});

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    batch_4_secrets: {
      executor: 'shared-iterations',
      maxDuration: "3h",
      vus: 12,
      iterations: 64500,
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
  const apiKey = apiKeys.at(exec.vu.idInTest-1);

  env.applianceUrl = env.applianceReadUrl
  env.conjurIdentity = `host/AutomationVault-hosts/${apiKey.lob_name}/${apiKey.safe_name}/host-1`;
  env.apiKey = apiKey.api_key;

  authn()

  // This magic number is tightly coupled with number of accounts in a default backup used in load tests.
  // It should be parametrized when dealing with running multiple load tests with different data
  const accountNumber = Math.ceil(Math.random() * 150) || 1;
  const identity = encodeURIComponent(`AutomationVault/${apiKey.lob_name}/${apiKey.safe_name}/account-`);

  const path = `/secrets?variable_ids=demo:variable:${identity}${accountNumber}%2Fvariable-1,` +
    `demo:variable:${identity}${accountNumber}%2Fvariable-2,` +
    `demo:variable:${identity}${accountNumber}%2Fvariable-3,` +
    `demo:variable:${identity}${accountNumber}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+1}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+1}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+1}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+1}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+2}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+2}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+2}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+2}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+3}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+3}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+3}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+3}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+4}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+4}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+4}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+4}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+5}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+5}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+5}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+5}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+6}%2Fvariable-1,` +
    `demo:variable:${identity}${accountNumber+6}%2Fvariable-2,` +
    `demo:variable:${identity}${accountNumber+6}%2Fvariable-3,` +
    `demo:variable:${identity}${accountNumber+6}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+7}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+7}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+7}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+7}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+8}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+8}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+8}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+8}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+9}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+9}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+9}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+9}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+10}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+10}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+10}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+10}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+11}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+11}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+11}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+11}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+12}%2Fvariable-1,` +
    `demo:variable:${identity}${accountNumber+12}%2Fvariable-2,` +
    `demo:variable:${identity}${accountNumber+12}%2Fvariable-3,` +
    `demo:variable:${identity}${accountNumber+12}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+13}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+13}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+13}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+13}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+14}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+14}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+14}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+14}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+15}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+15}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+15}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+15}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+16}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+16}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+16}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+16}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+17}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+17}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+17}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+17}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+18}%2Fvariable-1,` +
    `demo:variable:${identity}${accountNumber+18}%2Fvariable-2,` +
    `demo:variable:${identity}${accountNumber+18}%2Fvariable-3,` +
    `demo:variable:${identity}${accountNumber+18}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+19}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+19}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+19}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+19}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+20}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+20}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+20}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+20}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+21}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+21}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+21}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+21}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+22}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+22}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+22}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+22}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+23}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+23}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+23}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+23}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+24}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+24}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+24}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+24}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+25}%2Fvariable-1,` +
    `demo:variable:${identity}${accountNumber+25}%2Fvariable-2,` +
    `demo:variable:${identity}${accountNumber+25}%2Fvariable-3,` +
    `demo:variable:${identity}${accountNumber+25}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+26}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+26}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+26}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+26}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+27}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+27}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+27}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+27}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+28}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+28}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+28}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+28}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+29}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+29}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+29}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+29}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+30}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+30}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+30}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+30}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+31}%2Fvariable-1,` +
    `demo:variable:${identity}${accountNumber+31}%2Fvariable-2,` +
    `demo:variable:${identity}${accountNumber+31}%2Fvariable-3,` +
    `demo:variable:${identity}${accountNumber+31}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+32}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+32}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+32}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+32}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+33}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+33}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+33}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+33}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+34}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+34}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+34}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+34}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+35}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+35}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+35}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+35}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+36}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+36}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+36}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+36}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+37}%2Fvariable-1,` +
    `demo:variable:${identity}${accountNumber+37}%2Fvariable-2,` +
    `demo:variable:${identity}${accountNumber+37}%2Fvariable-3,` +
    `demo:variable:${identity}${accountNumber+37}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+38}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+38}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+38}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+38}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+39}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+39}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+39}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+39}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+40}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+40}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+40}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+40}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+41}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+41}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+41}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+41}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+42}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+42}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+42}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+42}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+43}%2Fvariable-1,` +
    `demo:variable:${identity}${accountNumber+43}%2Fvariable-2,` +
    `demo:variable:${identity}${accountNumber+43}%2Fvariable-3,` +
    `demo:variable:${identity}${accountNumber+43}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+44}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+44}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+44}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+44}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+45}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+45}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+45}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+45}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+46}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+46}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+46}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+46}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+47}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+47}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+47}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+47}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+48}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+48}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+48}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+48}%2Fvariable-4` +
    `demo:variable:${identity}${accountNumber+49}%2Fvariable-1` +
    `demo:variable:${identity}${accountNumber+49}%2Fvariable-2` +
    `demo:variable:${identity}${accountNumber+49}%2Fvariable-3` +
    `demo:variable:${identity}${accountNumber+49}%2Fvariable-4`;
  const res = conjurApi.get(http, env, path);

  readtwohundredSecretsBatchTrend.add(res.timings.duration);
  readtwohundredSecretsBatchFailRate.add(res.status !== 200);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "status is not 404": (r) => r.status !== 404,
    "status is not 401": (r) => r.status !== 401,
    "status is not 500": (r) => r.status !== 500
  });
}

export function handleSummary(data) {
  return {
    "./tools/performance-tests/k6/reports/read-batch-4-secrets-summary.html": htmlReport(data, {title: "Read Batch 4 Secrets " + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
