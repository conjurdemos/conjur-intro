import http from "k6/http";
import {check, sleep} from "k6";
import exec from 'k6/execution';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";
import {SharedArray} from 'k6/data';
import papaparse from "../modules/papaparse.min.js";

/**
 *  Init stage
 */
const env = lib.parseEnv();

const apiKeys = new SharedArray('ApiKeys', function () {
  return papaparse.parse(open("../data/api-keys.csv"), {header: true}).data;
});

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    warmup: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 1 },
        { duration: '1m', target: 30 },
        { duration: '1m', target: 50 },
      ],
      gracefulRampDown: '0s',
    }
  }
};

export function setup() {
}

export function authn() {
  // Authn to obtain token
  const res = conjurApi.authenticate(
    http,
    env
  );
  env.token = res.body;
}

export default function () {
  const apiKey = apiKeys.at(exec.vu.idInTest - 1);

  env.applianceUrl = env.applianceReadUrl
  env.conjurIdentity = `host/AutomationVault-hosts/${apiKey.lob_name}/${apiKey.safe_name}/host-1`;
  env.apiKey = apiKey.api_key;

  authn()

  const accountNumber = exec.scenario.iterationInTest % 201 || 1;
  const identity = `AutomationVault/${apiKey.lob_name}/${apiKey.safe_name}/account-${accountNumber}/variable-1`;
  const res = conjurApi.readSecret(http, env, identity);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "status is not 404": (r) => r.status !== 404,
    "status is not 401": (r) => r.status !== 401,
    "status is not 500": (r) => r.status !== 500
  });
  sleep(1);
}
