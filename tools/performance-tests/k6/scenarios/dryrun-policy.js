import http from "k6/http";
import {check} from "k6";
import {Counter, Trend, Rate} from 'k6/metrics';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";
import {htmlReport} from "https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js";
import {textSummary} from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import papaparse from "../modules/papaparse.min.js";

/**
 *  Init stage
 */
const requiredEnvVars = [
  "K6_CUSTOM_GRACEFUL_STOP",
  "POLICY_ID"
];

// These are custom k6 metrics that will be reported in the k6 summary.
const authenticateTrend = new Trend('http_req_duration_post_authn', true);
const authenticateFailRate = new Rate('http_req_failed_post_authn');
const dryrunReplacePolicyTrend = new Trend('http_req_duration_dryrun_replace_policy', true);
const dryrunReplacePolicyCount = new Counter('iterations_dryrun_replace_policy');
const dryrunReplacePolicyFailRate = new Rate('http_req_failed_dryrun_replace_policy');
const replacePolicyTrend = new Trend('http_req_duration_replace_policy', true);
const replacePolicyCount = new Counter('iterations_replace_policy');
const replacePolicyFailRate = new Rate('http_req_failed_replace_policy');
const preloadPolicyDataTrend = new Trend('http_req_duration_preload_policy_data', true);
const preloadPolicyDataCount = new Counter('iterations_preload_policy_data');
const preloadPolicyDataFailRate = new Rate('http_req_failed_preload_policy_data');

lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = '5m'
const executor = lib.getEnvVar("DRYRUN_POLICY_EXECUTOR")
const policyContentsSize = lib.getEnvVar("POLICY_CONTENTS_SIZE")
const policyId = lib.getEnvVar("POLICY_ID")
const vus = lib.getEnvVar("K6_CUSTOM_VUS")
const iterations = lib.getEnvVar("DRYRUN_ITERATIONS")

const env = lib.parseEnv();

let policyContents = open(`/tools/performance-tests/k6/data/policy/test-${policyContentsSize}.yml`);
let policyPreDataContents = open(`/tools/performance-tests/k6/data/policy/pre-data-${policyContentsSize}.yml`);

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
let scenarios, thresholds;

if (executor === 'constant-vus') {
  scenarios = {
    dryrun_policy: {
      duration: '5m',
      executor: executor,
      vus: vus,
      gracefulStop
    },
  };
  thresholds = {
    checks: ['rate == 1.0']
  };
} else {
  scenarios = {
    dryrun_policy: {
      executor: executor,
      vus: 1,
      iterations: iterations,
      gracefulStop,
      maxDuration: '1h'
    },
  };
  thresholds = {
    checks: ['rate == 1.0']
  };
}

export const options = {
  scenarios: scenarios,
  thresholds: thresholds
};

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
  const iterationPolicyId = executor !== 'constant-vus'
  ? `${policyId}-${policyContentsSize}-${__ITER + 1}`
  : `${policyId}-${policyContentsSize}-1`; // for constant-vus we use the same policy id

  env.applianceUrl = env.applianceMasterUrl

  if (executor !== 'constant-vus') {
    authn();
    const createPolicy = `
    - !policy
      id: ${iterationPolicyId}
      body: []
    `;
    conjurApi.loadPolicy(http, env, 'root', createPolicy);

    // preload policy data
    const preLoadPolicyRes = conjurApi.loadPolicy(
      http,
      env,
      iterationPolicyId,
      policyPreDataContents,
    );

    preloadPolicyDataTrend.add(preLoadPolicyRes.timings.duration);
    preloadPolicyDataFailRate.add(preLoadPolicyRes.status !== 201);
    preloadPolicyDataCount.add(1);

    check(preLoadPolicyRes, {
      "status is 201": (r) => r.status === 201,
      "status is not 500": (r) => r.status !== 500
    });
  }

  // dryrun replace policy
  const dryrunReplacePolicyRes = conjurApi.replacePolicy(http, env, iterationPolicyId, policyContents, true);

  dryrunReplacePolicyTrend.add(dryrunReplacePolicyRes.timings.duration);
  dryrunReplacePolicyFailRate.add(dryrunReplacePolicyRes.status !== 201 && dryrunReplacePolicyRes.status !== 200);
  dryrunReplacePolicyCount.add(1);

  check(dryrunReplacePolicyRes, {
    "status is 200 or 201": (r) => r.status === 200 || r.status === 201,
    "status is not 500": (r) => r.status !== 500
  });

  // replace policy
  // skip if multiple users at the same time - duplicate key PG error
  if (executor !== 'constant-vus') {
    const replacePolicyRes = conjurApi.replacePolicy(http, env, iterationPolicyId, policyContents);

    replacePolicyTrend.add(replacePolicyRes.timings.duration);
    replacePolicyFailRate.add(replacePolicyRes.status !== 201 && replacePolicyRes.status !== 200);
    replacePolicyCount.add(1);

    check(replacePolicyRes, {
      "status is 200 or 201": (r) => r.status === 200 || r.status === 201,
      "status is not 500": (r) => r.status !== 500
    });
  }
}

export function setup(){
  env.applianceUrl = env.applianceMasterUrl
  if (executor !== 'constant-vus') {
    return
  }

  authn();
  const iterationPolicyId = `${policyId}-${policyContentsSize}-1`

  const createPolicy = `
  - !policy
    id: ${iterationPolicyId}
    body: []
  `;
  conjurApi.loadPolicy(http, env, 'root', createPolicy);

  // preload policy data once
  const preLoadPolicyRes = conjurApi.loadPolicy(
    http,
    env,
    iterationPolicyId,
    policyPreDataContents,
  );

  preloadPolicyDataTrend.add(preLoadPolicyRes.timings.duration);
  preloadPolicyDataFailRate.add(preLoadPolicyRes.status !== 201);
  preloadPolicyDataCount.add(1);

  check(preLoadPolicyRes, {
    "status is 201": (r) => r.status === 201,
    "status is not 500": (r) => r.status !== 500
  });
}

export function handleSummary(data) {
  const {
    iterations_dryrun_replace_policy: {
      values: { rate: httpReqsDryrunReplacePolicy }
    },
    http_req_duration_dryrun_replace_policy: {
      values: {
        avg: avgResponseTimeDryrunReplacePolicy,
        max: maxResponseTimeDryrunReplacePolicy,
        min: minResponseTimeDryrunReplacePolicy
      }
    },
    iterations_preload_policy_data: {
      values: { rate: httpReqsPreloadPolicyData }
    },
    http_req_duration_preload_policy_data: {
      values: {
        avg: avgResponseTimePreloadPolicyData,
        max: maxResponseTimePreloadPolicyData,
        min: minResponseTimePreloadPolicyData
      }
    },
    http_req_failed: {
      values: { rate: failRate }
    },
    vus_max: {
      values: { max: vusMax }
    }
  } = data['metrics'];

  let httpReqsReplacePolicy;
  let avgResponseTimeReplacePolicy;
  let maxResponseTimeReplacePolicy;
  let minResponseTimeReplacePolicy;

  if (executor != 'constant-vus') {
    ({
      iterations_replace_policy: {
        values: { rate: httpReqsReplacePolicy }
      },
      http_req_duration_replace_policy: {
        values: {
          avg: avgResponseTimeReplacePolicy,
          max: maxResponseTimeReplacePolicy,
          min: minResponseTimeReplacePolicy
        }
      }
    } = data['metrics']);
  }

  const testNameDryrunReplacePolicy = "Dry-Run Replace a policy";
  const testNameReplacePolicy = "Replace a policy";
  const testNamePreloadPolicyData = "Preload policy data";
  const nodeType = lib.checkNodeType(env.applianceMasterUrl);

  const metricsArray = [
    ...lib.generateMetricsArray(
      nodeType,
      testNameDryrunReplacePolicy,
      vusMax,
      httpReqsDryrunReplacePolicy,
      avgResponseTimeDryrunReplacePolicy,
      maxResponseTimeDryrunReplacePolicy,
      minResponseTimeDryrunReplacePolicy,
      failRate
    ),
    ...lib.generateMetricsArray(
      nodeType,
      testNamePreloadPolicyData,
      vusMax,
      httpReqsPreloadPolicyData,
      avgResponseTimePreloadPolicyData,
      maxResponseTimePreloadPolicyData,
      minResponseTimePreloadPolicyData,
      failRate
    )
  ];

  // no replace policy data for constant vus
  if (executor !== 'constant-vus') {
    metricsArray.push(
      ...lib.generateMetricsArray(
        nodeType,
        testNameReplacePolicy,
        vusMax,
        httpReqsReplacePolicy,
        avgResponseTimeReplacePolicy,
        maxResponseTimeReplacePolicy,
        minResponseTimeReplacePolicy,
        failRate
      )
    );
  }

  const csv = papaparse.unparse(metricsArray);

  return {
    "./tools/performance-tests/k6/reports/metrics.csv": csv,
    "./tools/performance-tests/k6/reports/dryrun-policy-summary.html": htmlReport(data, {title: "Performance tests summary " + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, {indent: " ", enableColors: true}),
  };
}
