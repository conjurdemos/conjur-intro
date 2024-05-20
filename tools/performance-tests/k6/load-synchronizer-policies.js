import http from "k6/http";
import {check} from "k6";
import {sleep} from "k6";
import * as conjurApi from "./modules/api.js";
import * as lib from "./modules/lib.js";

const requiredEnvVars = [
  "POLICY_ID",
  "LOB_COUNT",
  "SAFE_COUNT"
];

lib.checkRequiredEnvironmentVariables(requiredEnvVars)

const policyDirectory = lib.getEnvVar("POLICY_DIRECTORY")
const policyId = lib.getEnvVar("POLICY_ID")
const lobCount = parseInt(lib.getEnvVar("LOB_COUNT"))
const safeCount = parseInt(lib.getEnvVar("SAFE_COUNT"))

let policyFiles = [];
for (let lobNumber = 1; lobNumber <= lobCount; lobNumber++) {
  for (let safeNumber = 1; safeNumber <= safeCount; safeNumber++) {
    policyFiles.push(`lob-${lobNumber}_safe-${safeNumber}.yml`);
  }
}

let policyContents = policyFiles.map(file => open(`${policyDirectory}/${file}`));

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

  for (let i = 0; i < policyContents.length; i++) {

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
    let lobsPolicyRes;
    let policyAttempts = 0;
    while (policyAttempts < 5) {
      lobsPolicyRes = conjurApi.loadPolicy(
        http,
        settings,
        policyId,
        policyContents[i]
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
}
