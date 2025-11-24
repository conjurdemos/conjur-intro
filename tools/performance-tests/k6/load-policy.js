import http from "k6/http";
import {check} from "k6";
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
  let authRes;

  // authn to obtain token
  authRes = conjurApi.authenticate(
    http,
    settings,
    true
  );

  check(authRes, {
    "status is 200": (r) => r.status === 200,
  });

  settings.token = authRes.body

  // create policy
  const lobsPolicyRes = conjurApi.loadPolicy(
    http,
    settings,
    policyId,
    policyContent
  );

  console.log("RESPONSE BODY START", lobsPolicyRes.body, "RESPONSE BODY END")

  check(lobsPolicyRes, {
    "status is 201": (r) => r.status === 201,
  });
}
