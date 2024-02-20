import http from "k6/http";
import { sleep, check, group } from "k6";
import { Trend, Rate } from 'k6/metrics';
import * as conjurApi from "./modules/api.js";
import * as lib from "./modules/lib.js";
import {load_policy} from "./modules/api.js";
import papaparse from "./modules/papaparse.min.js";
import { SharedArray } from 'k6/data';

/**
 *  Init stage
 */
const requiredEnvVars = [
    "K6_CUSTOM_GRACEFUL_STOP",
    "K6_CUSTOM_VUS",
    "K6_CUSTOM_ITERATIONS"
];

// These are custom k6 metrics that will be reported in the k6 summary.
const authenticateTrend = new Trend('http_req_duration_post_authn');
const authenticateFailRate = new Rate('http_req_failed_post_authn');
const readSecretsIndividuallyTrend = new Trend('http_req_duration_get_secrets_individually');
const readSecretsIndividuallyFailRate = new Rate('http_req_failed_get_secrets_individually');
const readSecretsBatchTrend = new Trend('http_req_duration_get_secrets_batch');
const readSecretsBatchFailRate = new Rate('http_req_failed_get_secrets_batch');

lib.checkRequiredEnvironmetVariables(requiredEnvVars);
const gracefulStop = lib.get_env_var("K6_CUSTOM_GRACEFUL_STOP");
const vus = lib.get_env_var("K6_CUSTOM_VUS")
const iterations = lib.get_env_var("K6_CUSTOM_ITERATIONS")

const env = lib.parse_env();

const csvData = new SharedArray('Secrets', function () {
    // Load CSV file and parse it using Papa Parse
    return papaparse.parse(open("./data/secrets.csv"), { header: true }).data;
});

const usersPolicy  = open("./data/policy/users.yml");
const policy  = open("./data/policy/policy.yml");
const myAppStagingPolicy  = open("./data/policy/myapp_staging.yml");
const myAppPolicy  = open("./data/policy/myapp.yml");
const applicationGrantsPolicy  = open("./data/policy/application_grants.yml");
const hostsPolicy  = open("./data/policy/hosts.yml");

let start = new Date()

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
    scenarios: {
        individual: {
            executor: 'per-vu-iterations',
            maxDuration: "1h",
            vus: 1,
            iterations: iterations,
            exec: "individually_retrieve_secrets",
            gracefulStop
        },
        batch: {
            executor: 'per-vu-iterations',
            maxDuration: "1h",
            vus: 1,
            iterations: iterations,
            exec: "batch_retrieve_secrets",
            gracefulStop
        },
        individual_parallel: {
            executor: 'per-vu-iterations',
            maxDuration: "1h",
            vus: vus,
            iterations: iterations,
            exec: "individually_retrieve_secrets",
            gracefulStop
        },
        batch_parallel: {
            executor: 'per-vu-iterations',
            maxDuration: "1h",
            vus: vus,
            iterations: iterations,
            exec: "batch_retrieve_secrets",
            gracefulStop
        }
    }, thresholds: {
        // TODO: To be set later after benchmark tests are fully refactored
        // http_reqs: ['rate > 75']
        checks: ['rate == 1.0']
    }
};

export function loadSecrets() {
    const {
        applianceMasterUrl,
        conjurAccount
    } = env;
    let reqs = [];
    let slice = [...csvData];
    while(slice.length > 0){
            if(slice.length){
                const item = slice.pop();
                // The value to write
                const secretIdentity = item.resource_id.replace(`${conjurAccount}:variable:`,'');
                const body = item.resource_body

                const headers = { 'Authorization': `Token token="${env.token}"` }
                const r = {
                    method: 'POST',
                    url: `${applianceMasterUrl}/secrets/${conjurAccount}/variable/${encodeURIComponent(secretIdentity)}`,
                    body,
                    params: {
                        headers: headers
                    },
                }
                reqs.push(r);
            }
            else {
                break;
            }

        const responses = http.batch(reqs);

        for (let i = 0; i < responses.length; i++) {
            console.log("RESPONSE CODE:", responses[i].status)
            check(responses[i], {
                "status is 201": (r) => r.status === 200 || r.status === 201,
            });
        }

        // dump the reqs for the next iteration
        reqs = [];
    }
}

export function loadPolicy(policyContent, policyId) {
    // create policy
    const lobsPolicyRes = conjurApi.load_policy(
        http,
        env,
        policyId,
        policyContent
    );

    console.log("RESPONSE BODY START", lobsPolicyRes.body, "RESPONSE BODY END")

    check(lobsPolicyRes, {
        "status is 201": (r) => r.status === 201,
    });
}
export function setup() {
    env.applianceUrl = env.applianceMasterUrl
    authn()
    loadPolicy(usersPolicy, "root")
    loadPolicy(policy, "root")
    loadPolicy(myAppStagingPolicy, "staging")
    loadPolicy(myAppPolicy, "production")
    loadPolicy(applicationGrantsPolicy, "root")
    loadPolicy(hostsPolicy, "root")
    loadSecrets()
}

export function authn () {
    // Ensure that authn trends are tracked if they fail
    env.authenticateTrend = authenticateTrend;
    env.authenticateFailRate = authenticateFailRate;

    // Authn to obtain token
    const res = conjurApi.authenticate(
        http,
        env,
        true
    );
    sleep(0.3);

    env.token = res.body;
}

export function individually_retrieve_secrets () {
    if (__ITER == 0) {
        env.applianceUrl = env.applianceFollowerUrl
        authn();
    }
    let now = new Date()
    // if 6 minutes elapsed, renew authentication
    if (now.getTime() - start.getTime() > 360000) {
        start.setTime(now.getTime())
        authn();
    }
    const identity = `production/myapp/database/username`
    const res = conjurApi.read_secret(http, env, identity);

    readSecretsIndividuallyTrend.add(res.timings.duration);
    readSecretsIndividuallyFailRate.add(res.status !== 200);

    check(res, {
        "status is 200": (r) => r.status === 200,
        "status is not 404": (r) => r.status !== 404,
        "status is not 401": (r) => r.status !== 401,
        "status is not 500": (r) => r.status !== 500
    });
}

export function batch_retrieve_secrets () {
    if (__ITER == 0) {
        env.applianceUrl = env.applianceFollowerUrl
        authn();
    }
    let now = new Date()
    // if 6 minutes elapsed, renew authentication
    if (now.getTime() - start.getTime() > 360000) {
        start.setTime(now.getTime())
        authn();
    }
    const path = `/secrets?variable_ids=demo:variable:production%2Fmyapp%2Fdatabase%2Fusername,demo:variable:production%2Fmyapp%2Fdatabase%2Fpassword,demo:variable:production%2Fmyapp%2Fdatabase%2Fport,demo:variable:production%2Fmyapp%2Fdatabase%2Furl`
    const res = conjurApi.get(http, env, path);

    readSecretsBatchTrend.add(res.timings.duration);
    readSecretsBatchFailRate.add(res.status !== 200);

    check(res, {
        "status is 200": (r) => r.status === 200,
        "status is not 404": (r) => r.status !== 404,
        "status is not 401": (r) => r.status !== 401,
        "status is not 500": (r) => r.status !== 500
    });
}
