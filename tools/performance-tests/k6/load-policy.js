import http from "k6/http";
import {check} from "k6";
import {sleep} from "k6";
import * as conjurApi from "./modules/api.js";
import * as lib from "./modules/lib.js";

/**
 *  Init stage
 */
const requiredEnvVars = [
  "POLICY_FILE",
  "POLICY_ID"
];

lib.checkRequiredEnvironmentVariables(requiredEnvVars)

const policyFile = lib.getEnvVar("POLICY_FILE")
const policyId = lib.getEnvVar("POLICY_ID")
const policyContent = open(policyFile);

export const options = {
  scenarios: {
    policy: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      // 6 hours
      maxDuration: '21600s',
    },
  },
};

export default function () {
  const settings = lib.parseEnv();
  settings.applianceUrl = settings.applianceMasterUrl

  // authn to obtain token, retry up to 5 times if authn fails
  let authRes;
  let authAttempts = 0;
  while (authAttempts < 5) {
    authRes = conjurApi.authenticate(
      http,
      settings
    );

    if (authRes.status === 200) {
      break;
    }
    authAttempts++;
    console.log("Authn failed, retrying (attempt ", authAttempts, "/5)");
    sleep(3);
  }

  check(authRes, {
    "status is 200": (r) => r.status === 200,
  });

  settings.token = authRes.body

  // create policy, retry up to 5 times if policy creation fails
  let policyAttempts = 0;
  let lobsPolicyRes;
  while (policyAttempts < 5) {
    lobsPolicyRes = conjurApi.loadPolicy(
      http,
      settings,
      policyId,
      policyContent
    );

    if (lobsPolicyRes.status === 201) {
      break;
    }
    policyAttempts++;
    console.log("Request failed, retrying (attempt ", policyAttempts, "/5)");
    sleep(3);
  }

  console.log("RESPONSE BODY START", lobsPolicyRes.body, "RESPONSE BODY END")

  check(lobsPolicyRes, {
    "status is 201": (r) => r.status === 201,
  });
}
