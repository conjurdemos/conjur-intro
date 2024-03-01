import http from "k6/http";
import { check } from "k6";
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
            policyContents[i]
        );

        console.log("RESPONSE BODY START", lobsPolicyRes.body, "RESPONSE BODY END")

        check(lobsPolicyRes, {
            "status is 201": (r) => r.status === 201,
        });
    }
}
