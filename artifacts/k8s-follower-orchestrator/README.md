# Running k8s-follower with Kind

## Architecture

To be able to provide exact same architecture for both local development and pipeline jobs,
we are using [Kind](https://kind.sigs.k8s.io/) to run a Kubernetes cluster inside a Docker
container (something like KinDinD - Kubernetes in Docker in Docker).

Kind main container (could be treated as an orchestrator of kind) is defined in `docker-compose.yml`
file at root of the project to be able to run inside DAP stack network.
This container ramps up a Kubernetes cluster outside compose (called conjur-intro-k8s-follower-control-plane).

Kubeconfig for running cluster can be found at the root of the project in [kubeconfig](../../kubeconfig) file.
This file is committed as empty to the repository and it shouldn't be committed with any data.

After running the cluster pods within the cluster can access DAP network using `host.docker.internal` address,
but DAP itself cannot access k8s-follower pods in the opposite.

## Quick run

To run latest build from `master` branch (with tag edge) of k8s-follower use:

```shell
bin/dap --provision-k8s-follower
```

For specific tag version flag could be specified:

```shell
bin/dap --provision-k8s-follower --k8s-follower-version 2.3.2-32
```

## Step-by-step run

This steps was taken directly from CyberArks docs for [configuring Conjur Follower inside Kubernetes](https://docs.cyberark.com/conjur-enterprise/latest/en/Content/Integrations/k8s-ocp/k8s-jwt-authn.htm).

Export required env variables that will ensure that `kubectl` will be able to connect to the cluster.

```shell
API_SERVER_URL=$(kind get --name conjur-intro-k8s-follower kubeconfig | grep server | awk '{print $2}' | sed 's/127.0.0.1/host.docker.internal/')
KUBE_OPTS="--insecure-skip-tls-verify --server=$API_SERVER_URL --context kind-conjur-intro-k8s-follower"
```

### Configure the JWT Authenticator

#### Discover Kubernetes resources

In this step you collect information from the Kubernetes cluster configuration that you need when configuring the JWT Authenticator.

Run the following command to retrieve the JWKS output from Kubernetes

```shell
kubectl $KUBE_OPTS get --raw $(kubectl $KUBE_OPTS get --raw /.well-known/openid-configuration | jq -r '.jwks_uri')
```

Sample output

```json
{"keys":[{"use":"sig","kty":"RSA","kid":"c0q58sFKVEtU_o1Of6HkvJhlDLCyzUR8wii7-C-6oZM","alg":"RS256","n":"sLRS9mIUB88Zul1lfKN-QNTKq6P4cy5aRVQqgudusqpXgNGBNUFy1K-hX1SFO85gJba9sqVdDgaU7meJo7CeDUWBD-eBXQVlyenFo_m3jCieDH9MHKk6eyoGocVhHEWGGrx3iLM29a3Ruk7578TSQZJWhDPJVznK9AMGfcaz3SdpS7z_WUkEtueo78EK75SoOGVdfLeswOvi6yvIkg5FEVFb5G3SYgQy5wvRnt-pKa3p3ppD-2c43wUSwbYiBGP6I44GEOmEcO9RSSKoOvfdDoW2vAzLVQeVfC9Qr0VD7y9BO9OSC5Qw-vIl2PkGZNR8edOw5BiUTueFhmuP51Lnuw","e":"AQAB"}]}
```

Run the following command to retrieve the service account token issuer

```shell
kubectl $KUBE_OPTS get --raw /.well-known/openid-configuration | jq -r '.issuer'
```

Sample output

```text
https://kubernetes.default.svc.cluster.local
```

#### Define the JWT Authenticator in Conjur

In this step you define and load policy for the JWT Authenticator, dev-cluster.

```shell
bin/cli conjur policy load -b root -f artifacts/k8s-follower-orchestrator/jwt-authenticator-webservice-policy.yaml
```

#### Populate the policy variables

Populate public-keys with the jwks that you retrieved from Kubernetes.
We cannot use bin/cli because it removes double quotes and therefore the JSON is not valid.

```shell
curl -k -X POST \
    -H "$(bin/cli conjur authenticate -H | tail -n1)" \
    --data "{\"type\":\"jwks\",\"value\":$jwks}" \
    "https://localhost/secrets/demo/variable/conjur%2Fauthn-jwt%2Fdev-cluster%2Fpublic-keys"
```

Populate the issuer variable with the service account token issuer that you retrieved from Kubernetes

```shell
bin/cli conjur variable set -i conjur/authn-jwt/dev-cluster/issuer -v https://kubernetes.default.svc.cluster.local
```

Populate the token-app-property variable with the value, "sub". This creates a 1:1 relationship between the policy and the app ID in Conjur based on the "sub" claim in the service account token

```shell
bin/cli conjur variable set -i conjur/authn-jwt/dev-cluster/token-app-property -v "sub"
```

Populate the identity-path variable with the app ID path, (without the host/ prefix)

```shell
bin/cli conjur variable set -i conjur/authn-jwt/dev-cluster/identity-path -v apps
```

Populate the audience variable with the value

```shell
bin/cli conjur variable set -i conjur/authn-jwt/dev-cluster/audience -v "https://host.docker.internal"
```

#### Enable the JWT Authenticator in Conjur

```shell
docker compose exec -T conjur-master-1.mycompany.local bash -c "evoke variable set CONJUR_AUTHENTICATORS authn-jwt/dev-cluster,authn"
```

Wait for services to come healthy.

#### Check the JWT Authenticator status

```shell
curl -k -H "$(bin/cli conjur authenticate -H | tail -n1)" https://localhost/authn-jwt/dev-cluster/demo/status
```

Sample output

```
{"status":"ok"}%
```

### Deploy Conjur Kubernetes Follower

#### Install the Follower Operator

Pull all required images:

  - registry.tld/cyberark/conjur-kubernetes-follower-operator
  - registry.tld/cyberark/conjur-kubernetes-follower-configurator
  - registry.tld/cyberark/conjur-kubernetes-follower-conjur
  - registry.tld/cyberark/conjur-kubernetes-follower-info
  - registry.tld/cyberark/conjur-kubernetes-follower-nginx
  - registry.tld/cyberark/conjur-kubernetes-follower-postgres
  - registry.tld/cyberark/conjur-kubernetes-follower-syslog-ng
  - registry.tld/cyberark/conjur-kubernetes-follower-failover-rebaser

Tag them as docker.io registry and then load them into the kind cluster.

Apply the Operator manifests

```shell
kubectl $KUBE_OPTS apply -f /manifests/operator
```

#### Deploy the Conjur Kubernetes Follower

To enable the Conjur Kubernetes Follower to connect to Conjur, it first needs to authenticate to Conjur

##### Register the seed generation service

```shell
bin/cli conjur policy load -f artifacts/k8s-follower-orchestrator/seed-generation-policy.yaml  -b root
```

##### Give the Conjur Kubernetes Follower permission to authenticate to Conjur and to use the seed service using the dev-cluster JWT Authenticator

```shell
bin/cli conjur policy load -f artifacts/k8s-follower-orchestrator/conjur-kubernetes-follower-policy.yaml -b root
```

##### Create a ConfigMap for the Conjur certificate

Load `conjur-master.mycompany.local.pem` into configmap

```shell
kubectl $KUBE_OPTS create configmap -n cyberark-conjur conjur-cert --from-file=/etc/ssl/certs/conjur-master.mycompany.local.pem
```

##### Deploy the Conjur Kubernetes Follower


```shell
kubectl $KUBE_OPTS apply -f /manifests/samples
```
