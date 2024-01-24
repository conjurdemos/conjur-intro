import http from "k6/http";
import papaparse from './modules/papaparse.min.js';
import { check } from "k6";
import { SharedArray } from 'k6/data';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import * as conjurApi from "./modules/api.js";
import * as lib from "./modules/lib.js";

/**
 * PURPOSE:
 * 
 * Loading secrets from a CSV file
 * 
 */

const MAX_RPS = 300;
const K6_VUS = 1;
const CSV_FILE_PATH = './data/secrets.csv';

const csvData = new SharedArray('Secrets', function () {
  // Load CSV file and parse it using Papa Parse
  return papaparse.parse(open(CSV_FILE_PATH), { header: true }).data;
});

// Define test options
// https://k6.io/docs/using-k6/k6-options/reference/
export const options = {
  // Throttle to a max of X requests per second
  rps: MAX_RPS,
  scenarios: {
    loadSecrets: {
      executor: 'per-vu-iterations',
      vus: K6_VUS, // K6_VUS,
      iterations: 1,
      // 6 hours
      maxDuration: '21600s',
    },
  },
};

// Returns a subset of the given data array. This appears to be deterministic
// (the same VU will get the same subset).
function getSlice(data, n) {
  let partSize = Math.floor(data.length / n);
  return data.slice(partSize*__VU, partSize*__VU+partSize);
}

export default function () {
  const env = lib.parse_env();
  const {
    applianceUrl,
    conjurAccount
  } = env;
  let slice 

  // Get a slice of data equal to csv length / # VUs
  // If the CSV is short, do not split the data between VUs at all. This
  // may result in duplicate writes, but ensures that a CSV size indivisible
  // by the number of VUs actually ensures that the remaining secrets are
  // written.
  if(csvData.length < 50) {
    slice = [...csvData];
  }else{
    slice = getSlice(csvData, K6_VUS);
  }

  /**
   *  TODO:
   *  - get token, an update it if expired in this loop. This works b/c each HTTP request is sent across k6 1 iteration.
   */

  let reqs = [];
  const maxBatchSize = 50;
  while(slice.length > 0){
    while(reqs.length < maxBatchSize){
      if(slice.length){
        const item = slice.pop();
        // The value to write
        const secretIdentity = item.resource_id.replace(`${conjurAccount}:variable:`,'');
        const body = item.resource_body
        // Authn to obtain token
        const authRes = conjurApi.authenticate(
          http,
          env
        );

        check(authRes, {
          "status is 200": (r) => r.status === 200,
        });

        const token = authRes.body;
        const headers = { 'Authorization': `Token token="${token}"` }

        const r = {
          method: 'POST',
          url: `${applianceUrl}/secrets/${conjurAccount}/variable/${encodeURIComponent(secretIdentity)}`,
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
    }
    
    const responses = http.batch(reqs);

    for (let i = 0; i < responses.length; i++) {
      check(responses[i], {
        "status is 201": (r) => r.status === 200 || r.status === 201,
      });
    }

    // dump the reqs for the next iteration
    reqs = [];
  }
}
