import {check, fail} from "k6";

// Returns an http response. This allows assertions on the response to be made.
export function authenticate(client, data, exitOnFailure = false) {
  const {
    applianceUrl,
    conjurAccount,
    conjurIdentity,
    apiKey,
    authenticateTrend,
    authenticateFailRate
  } = data;

  const headers = {'Accept-Encoding': 'base64'}
  const res = client.post(
    `${applianceUrl}/authn/${conjurAccount}/${encodeURIComponent(conjurIdentity)}/authenticate`,
    apiKey,
    {
      headers,
      tags: {endpoint: 'PostAuthnURL'},
      // timeout: "500s" // Changes k6 status 0 error_code 1050 to HTTP 504
    }
  )

  // If given a trend or rate, be sure to add it here
  authenticateTrend ? authenticateTrend.add(res.timings.duration) : null;
  authenticateFailRate ? authenticateFailRate.add(res.status !== 200) : null;

  // Fail if the authn request did not return a token
  if (exitOnFailure) {
    if (!check(res, {
      "status is 200": (r) => r.status === 200,
    })) {
      fail(`Authn request failed with status '${res.status}' and status_text: '${res.status_text}'. Stopping this iteration.`)
    }
  }

  return res
}

export function loadPolicy(client, data, policy_id, policy_body, dryrun=false) {
  const {
    applianceMasterUrl,
    conjurAccount,
    token
  } = data;
  const headers = {'Authorization': `Token token="${token}"`}

  return client.post(
    `${applianceMasterUrl}/policies/${conjurAccount}/policy/${policy_id}?dryRun=${dryrun}`,
    policy_body,
    {
      headers,
      timeout: '1h',
      tags: {endpoint: 'PostPoliciesURL'},
    }
  )
}

export function replacePolicy(client, data, policy_id, policy_body, dryrun=false) {
  const {
    applianceMasterUrl,
    conjurAccount,
    token
  } = data;
  const headers = {'Authorization': `Token token="${token}"`}

  return client.put(
    `${applianceMasterUrl}/policies/${conjurAccount}/policy/${policy_id}?dryRun=${dryrun}`,
    policy_body,
    {
      headers,
      timeout: '1h',
      tags: {endpoint: 'PutPoliciesURL'},
    }
  )
}

export function readSecret(client, data, identity) {
  const {
    applianceReadUrl,
    conjurAccount,
    token
  } = data;

  const headers = {'Authorization': `Token token="${token}"`};
  const url = `${applianceReadUrl}/secrets/${conjurAccount}/variable/${identity}`;

  return client.get(
    url,
    {
      headers,
      tags: {endpoint: 'GetSecretsURL'}
    }
  )
}

export function writeSecret(client, data, resourceId, resourceBody) {
  const {
    applianceMasterUrl,
    conjurAccount,
    token
  } = data;

  const headers = {'Authorization': `Token token="${token}"`};

  return client.post(
    `${applianceMasterUrl}/secrets/${conjurAccount}/variable/${resourceId}`,
    resourceBody,
    {
      headers,
      timeout: '10s',
      tags: {endpoint: 'PostSecretsURL'},
    }
  );
}

export function createAwsIssuer(client, data, name, accessKeyId, awsSecretAccessKey) {
  const {
    applianceMasterUrl,
    conjurAccount,
    token
  } = data;
  const headers = {
    'Authorization': `Token token="${token}"`,
    'Content-Type': 'application/json'
  };
  const body = {
    id: name,
    max_ttl: 3600,
    type: "aws",
    data: {
      access_key_id: accessKeyId,
      secret_access_key: awsSecretAccessKey
    }
  };
  const payload =  JSON.stringify(body);

  return client.post(
    `${applianceMasterUrl}/api/issuers/${conjurAccount}`,
    payload,
    {
      headers,
      timeout: '1h',
      tags: {endpoint: 'PostIssuersURL'},
    }
  );
}

export function get(client, data, path) {
  const {
    applianceReadUrl,
    token
  } = data;

  const headers = {'Authorization': `Token token="${token}"`};
  const url = `${applianceReadUrl}/${path}`;

  return client.get(
    url,
    {
      headers,
      tags: {endpoint: 'GetSecretsURL'}
    }
  )
}

export function list(client, data, limit, offset) {
  const {
    applianceReadUrl,
    token
  } = data;

  const headers = {'Authorization': `Token token="${token}"`};
  const url = `${applianceReadUrl}/resources?kind=variable&limit=${limit}&offset=${offset}`;

  return client.get(
    url,
    {
      headers,
      tags: {endpoint: 'ListResourcesURL'}
    }
  )
}
