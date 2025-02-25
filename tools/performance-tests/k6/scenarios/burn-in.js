import http from "k6/http";
import {check} from "k6";
import exec from 'k6/execution';
import {Trend, Rate} from 'k6/metrics';
import * as conjurApi from "../modules/api.js";
import * as lib from "../modules/lib.js";
import papaparse from "../modules/papaparse.min.js";
import {SharedArray} from 'k6/data';
import {htmlReport} from "https://raw.githubusercontent.com/benc-uk/k6-reporter/2.4.0/dist/bundle.js";
import {textSummary} from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import {retrieveApiKey, uuid} from "../modules/lib.js";
import shellExec from 'k6/x/exec';

/**
 *  Init stage
 */
const requiredEnvVars = [
  "K6_CUSTOM_GRACEFUL_STOP",
  "K6_CUSTOM_VUS",
  "K6_CUSTOM_ITERATIONS"
];

// These are custom k6 metrics that will be reported in the k6 summary.
const authenticateTrend = new Trend('http_req_duration_post_authn', true);
const authenticateFailRate = new Rate('http_req_failed_post_authn');
const readSecretTrend = new Trend('http_req_duration_get_secret', true);
const readSecretFailRate = new Rate('http_req_failed_get_secret');
const cliTrend = new Trend('cli_call_duration');
const cliFailRate = new Rate('cli_call_failed');
// Variables metrics
const variableSetTrend = new Trend('cli_call_duration_variable_set', true);
const variableSetFailRate = new Rate('cli_call_failed_variable_set');
const variableCheckTrend = new Trend('cli_call_duration_variable_check', true);
const variableCheckFailRate = new Rate('cli_call_failed_variable_check');
const variableGetTrend = new Trend('cli_call_duration_variable_get', true);
const variableGetFailRate = new Rate('cli_call_failed_variable_get');
// Rotation metrics
const userRotateTrend = new Trend('cli_call_duration_user_rotate', true);
const userRotateFailRate = new Rate('cli_call_failed_user_rotate');
const hostRotateTrend = new Trend('cli_call_duration_host_rotate', true);
const hostRotateFailRate = new Rate('cli_call_failed_host_rotate');
// Host factory metrics
const hostFactoryCreateTrend = new Trend('cli_call_duration_host_factory_create', true);
const hostFactoryCreateFailRate = new Rate('cli_call_failed_host_factory_create');
const hostFactoryHostsCreateTrend = new Trend('cli_call_duration_host_factory_hosts_create', true);
const hostFactoryHostsCreateFailRate = new Rate('cli_call_failed_host_factory_hosts_create');
// Random intensive tasks metrics
const randomIntensiveTrend = new Trend('cli_call_duration_random_intensive', true);
const randomIntensiveFailRate = new Rate('cli_call_failed_random_intensive');
// Authenticate metrics
const authenticationCliTrend = new Trend('cli_call_duration_authentication', true);
const authenticationCliFailRate = new Rate('cli_call_failed_authentication');
// Policy metrics
const policyFetchTrend = new Trend('cli_call_duration_policy_fetch', true);
const policyFetchFailRate = new Rate('cli_call_failed_policy_fetch');
const policyDryRunTrend = new Trend('cli_call_duration_policy_dry_run', true);
const policyDryRunFailRate = new Rate('cli_call_failed_policy_dry_run');


lib.checkRequiredEnvironmentVariables(requiredEnvVars);
const gracefulStop = lib.getEnvVar("K6_CUSTOM_GRACEFUL_STOP");
const vus = lib.getEnvVar("K6_CUSTOM_VUS");
const iterations = lib.getEnvVar("K6_CUSTOM_ITERATIONS");
const desired_lob = lib.getEnvVar("DESIRED_LOB");
const desired_safe = lib.getEnvVar("DESIRED_SAFE");

const env = lib.parseEnv();

const apiKeys = new SharedArray('ApiKeys', function () {
  return papaparse.parse(open("../data/api-keys.csv"), {header: true}).data;
});

const dryRunPolicySize = "100KB"

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  scenarios: {
    read_secret: {
      executor: 'shared-iterations',
      maxDuration: "3h",
      vus: vus,
      iterations: iterations,
      exec: "readSecret",
      gracefulStop
    },
    cli: {
      executor: 'shared-iterations',
      maxDuration: "3h",
      vus: vus,
      iterations: iterations,
      exec: "cli",
      gracefulStop
    }
  }, thresholds: {
    // iterations: ['rate > 85'],
    checks: ['rate == 1.0']
  }
};

export function setup() {
  initAndLoginConjurCli(env.applianceReadUrl, env.conjurAccount, env.conjurPassword);
  runCliCommand(["policy", "load", "replace", "-b", "root", "-f", "/tools/performance-tests/k6/data/policy/burnin-policy.yml"], null, null);
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

export function readSecret() {
  const apiKey = retrieveApiKey(apiKeys, exec.vu.idInTest - 1, desired_lob, desired_safe);

  env.applianceUrl = env.applianceReadUrl
  env.conjurIdentity = `host/AutomationVault-hosts/${apiKey.lob_name}/${apiKey.safe_name}/host-1`;
  env.apiKey = apiKey.api_key;

  authn()

  // This magic number is tightly coupled with number of accounts in a default backup used in load tests.
  // It should be parametrized when dealing with running multiple load tests with different data
  const accountNumber = Math.ceil(Math.random() * 200) || 1;
  // Randomize one of 5 secrets to read
  const variableNumber = Math.ceil(Math.random() * 5) || 1;
  const identity = `AutomationVault/${apiKey.lob_name}/${apiKey.safe_name}/account-${accountNumber}/variable-${variableNumber}`;

  const res = conjurApi.readSecret(http, env, identity);

  readSecretTrend.add(res.timings.duration);
  readSecretFailRate.add(res.status !== 200);

  check(res, {
    "HTTP status is 200": (r) => r.status === 200,
    "HTTP status is not 404": (r) => r.status !== 404,
    "HTTP status is not 401": (r) => r.status !== 401,
    "HTTP status is not 500": (r) => r.status !== 500
  });
}

function initAndLoginConjurCli(applianceUrl, conjurAccount, password) {
  shellExec.command("/tools/performance-tests/k6/bin/conjur-cli-init", [applianceUrl, conjurAccount, password]);
  runCliCommand( ["login", "-i", "admin", "-p", password], null, null);
  console.log(runCliCommand(["whoami"], null, null));
}

function runCliCommand(args, trend, failRate) {
  let output = null;
  let start = new Date();
  try {
    output = shellExec.command("conjur",args, {
      "continue_on_error": true
    });
    // command passed
    if(failRate !== null) {
      failRate.add(false);
      cliFailRate.add(false);
      check(output, {
        "command passed": true,
      });
    }
  } catch (e) {
    // command failed - add to fail rate
    if(failRate !== null) {
      failRate.add(true);
      cliFailRate.add(true);
      check(output, {
        "command passed": false,
      });
    }
    if (e.value && e.value.stderr) {
      console.error(String.fromCharCode.apply(null, e.value.stderr))
    }
  }
  if(trend !== null) {
    let duration = new Date() - start;
    trend.add(duration);
    cliTrend.add(duration);
  }
  return output
}

function runVariablesCommands(identity) {
  runCliCommand(["variable", "set", "-i", identity, "-v", `${Math.random()}`], variableSetTrend, variableSetFailRate);
  runCliCommand(["check", "variable:" + identity, "read"], variableCheckTrend, variableCheckFailRate);
  runCliCommand(["variable", "get", "-i", identity], variableGetTrend, variableGetFailRate);
}

function runRotationCommands(lob_name, safe_name) {
  runCliCommand(["user", "rotate-api-key", "-i", `user-1@AutomationVault-users-${lob_name}-${safe_name}`], userRotateTrend, userRotateFailRate);
  runCliCommand(["host", "rotate-api-key", "-i", `AutomationVault-hosts/${lob_name}/${safe_name}/host-1`], hostRotateTrend, hostRotateFailRate);
}

function runHostFactoryCommands() {
  let response = runCliCommand(["hostfactory", "tokens", "create", "-i", "burn-in/myapp"], hostFactoryCreateTrend, hostFactoryCreateFailRate);
  let hfToken = JSON.parse(response)[0].token;
  runCliCommand(["hostfactory", "hosts", "create", "-i", `machine-${uuid()}`, "-t", hfToken], hostFactoryHostsCreateTrend, hostFactoryHostsCreateFailRate);
}

function runRandomIntensiveTasks(identity, lob_name, safe_name) {
  runCliCommand(["list", "--inspect", "-l", "10"], randomIntensiveTrend, randomIntensiveFailRate);
  runCliCommand(["pubkeys", "admin"], randomIntensiveTrend, randomIntensiveFailRate);
  runCliCommand(["resource", "exists", `variable:${identity}`], randomIntensiveTrend, randomIntensiveFailRate);
  runCliCommand(["resource", "permitted-roles", `variable:${identity}`, "execute"], randomIntensiveTrend, randomIntensiveFailRate);
  runCliCommand(["role", "members", "-v", `group:AutomationVault/${lob_name}/${safe_name}-admins`], randomIntensiveTrend, randomIntensiveFailRate);
  runCliCommand(["role", "memberships", "user:admin"], randomIntensiveTrend, randomIntensiveFailRate);
  runCliCommand(["resource", "show", "policy:root"], randomIntensiveTrend, randomIntensiveFailRate);
  runCliCommand(["resource", "show", `user:user-1@AutomationVault-users-${lob_name}-${safe_name}`], randomIntensiveTrend, randomIntensiveFailRate);
  runCliCommand(["resource", "show", `variable:${identity}`], randomIntensiveTrend, randomIntensiveFailRate);
}

function runAuthenticationCommands(password) {
  runCliCommand(["logout"], authenticationCliTrend, authenticationCliFailRate);
  runCliCommand(["login", "-i", "admin", "-p", password], authenticationCliTrend, authenticationCliFailRate);
  runCliCommand(["whoami"], authenticationCliTrend, authenticationCliFailRate);
  runCliCommand(["authenticate"], authenticationCliTrend, authenticationCliFailRate);
}

function runPolicyFetchCommands(branch) {
  runCliCommand(["policy", "fetch", "-b", branch], policyFetchTrend, policyFetchFailRate);
}

function runPolicyDryRunCommands(policySize) {
  const policyFile = `/tools/performance-tests/k6/data/policy/test-${policySize}.yml`
  let output = runCliCommand(["policy", "load", "-b", "root", "-f", policyFile, "--dry-run"], policyDryRunTrend, policyDryRunFailRate);
}

export function cli() {
  const apiKey = retrieveApiKey(apiKeys, exec.vu.idInTest - 1, desired_lob, desired_safe);
  const lob_name = apiKey.lob_name;
  const safe_name = apiKey.safe_name;
  // This magic number is tightly coupled with number of accounts in a default backup used in load tests.
  // It should be parametrized when dealing with running multiple load tests with different data
  const accountNumber = Math.ceil(Math.random() * 200) || 1;
  // Randomize one of 5 secrets to read
  const variableNumber = Math.ceil(Math.random() * 5) || 1;
  const identity = `AutomationVault/${lob_name}/${safe_name}/account-${accountNumber}/variable-${variableNumber}`;
  const branch = `AutomationVault/${lob_name}/${safe_name}`;

  runVariablesCommands(identity);
  runRotationCommands(lob_name, safe_name);
  runHostFactoryCommands();
  runRandomIntensiveTasks(identity, lob_name, safe_name);
  runAuthenticationCommands(env.conjurPassword);
  runPolicyFetchCommands(branch);
  runPolicyDryRunCommands(dryRunPolicySize);
}

export function handleSummary(data) {
  const {
    iterations: {
      values: {rate: iterationRate}
    },
    http_req_duration_get_secret: {
      values: {avg: avgHttpResponseTime, max: maxHttpResponseTime, min: minHttpResponseTime}
    },
    http_req_failed: {
      values: {rate: failRate}
    },
    cli_call_duration: {
      values: {avg: avgCliResponseTime, max: maxCliResponseTime, min: minCliResponseTime}
    },
    cli_call_failed: {
      values: {rate: cliFailRate}
    },
    vus_max: {
      values: {max: vusMax}
    }
  } = data['metrics'];

  const testName = "Burn-in test";
  const nodeType = lib.checkNodeType(env.applianceReadUrl);

  const csv = papaparse.unparse(
    lib.generateBurnInMetricsArray(nodeType, testName, vusMax, iterationRate, avgHttpResponseTime, maxHttpResponseTime, minHttpResponseTime, avgCliResponseTime, maxCliResponseTime, minCliResponseTime, failRate, cliFailRate)
  );

  return {
    "./tools/performance-tests/k6/reports/metrics.csv": csv,
    "./tools/performance-tests/k6/reports/burn-in-summary.html": htmlReport(data, {title: "Burn-in test " + new Date().toISOString().slice(0, 16).replace('T', ' ')}),
    stdout: textSummary(data, {indent: " ", enableColors: true}),
  };
}
