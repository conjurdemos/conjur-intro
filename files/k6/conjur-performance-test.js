import http from "k6/http";
import { sleep, check, group } from "k6";
import { Trend, Rate } from 'k6/metrics';
import * as conjurApi from "./modules/api.js";
import * as lib from "./modules/lib.js";

/**
 *  Init stage
 */
const requiredEnvVars = [
    "K6_CUSTOM_ARRIVAL_RATE",
    "K6_CUSTOM_DURATION",
    "K6_CUSTOM_GRACEFUL_STOP",
    "K6_CUSTOM_PRE_ALLOCATED_VUS",
    "K6_CUSTOM_TIME_UNIT",
    "K6_CUSTOM_MAX_VUS"
];

// These are custom k6 metrics that will be reported in the k6 summary.
// NOTE: if writing InfluxDB queries, it is recommended to leverage the GROUPS
// in your queries as opposed to the metrics created by these metrics.
const authenticateTrend = new Trend('http_req_duration_post_authn');
const authenticateFailRate = new Rate('http_req_failed_post_authn')
const readSecretsIndividuallyTrend = new Trend('http_req_duration_get_secrets_individually');
const readSecretsIndividuallyFailRate = new Rate('http_req_failed_get_secrets_individually');
const readSecretsBatchTrend = new Trend('http_req_duration_get_secrets_batch');
const readSecretsBatchFailRate = new Rate('http_req_failed_get_secrets_batch');

lib.checkRequiredEnvironmetVariables(requiredEnvVars);
const arrivalRate = lib.get_env_var("K6_CUSTOM_ARRIVAL_RATE")
const duration = lib.get_env_var("K6_CUSTOM_DURATION");
const gracefulStop = lib.get_env_var("K6_CUSTOM_GRACEFUL_STOP");
const preAllocatedVUs = lib.get_env_var("K6_CUSTOM_PRE_ALLOCATED_VUS");
const timeUnit = lib.get_env_var("K6_CUSTOM_TIME_UNIT");
const vus = lib.get_env_var("K6_CUSTOM_MAX_VUS")

const env = lib.parse_env();

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
    scenarios: {
        read_secret: {
            executor: 'constant-arrival-rate',
            rate: arrivalRate,
            timeUnit: timeUnit,
            duration: duration,
            preAllocatedVUs: preAllocatedVUs,
            maxVUs: vus,
            gracefulStop
        }
    },
};

export default function () {
    group('authn', function () {
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
    });

    group('individually retrieve secrets', function () {
        const identity = `production/myapp/database/username`
        const res = conjurApi.read_secret(http, env, identity);

        readSecretsIndividuallyTrend.add(res.timings.duration);
        readSecretsIndividuallyFailRate.add(res.status !== 200);

        check(res, {
            "status is 200": (r) => r.status === 200,
            "status is not 404": (r) => r.status !== 404,
        });
    });

    group('batch retrieve secrets', function () {
        const path = `/secrets?variable_ids=demo:variable:production%2Fmyapp%2Fdatabase%2Fusername,demo:variable:production%2Fmyapp%2Fdatabase%2Fpassword,demo:variable:production%2Fmyapp%2Fdatabase%2Fport,demo:variable:production%2Fmyapp%2Fdatabase%2Furl`
        const res = conjurApi.get(http, env, path);

        readSecretsBatchTrend.add(res.timings.duration);
        readSecretsBatchFailRate.add(res.status !== 200);

        check(res, {
            "status is 200": (r) => r.status === 200,
            "status is not 404": (r) => r.status !== 404,
        });
    });
    sleep(0.3);
}
