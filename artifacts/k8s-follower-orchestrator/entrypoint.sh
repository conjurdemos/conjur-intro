#!/bin/ash

set -e

cleanup() {
  echo "Cleaning up..."
  kind delete cluster --name conjur-intro-k8s-follower
}

trap cleanup SIGINT SIGTERM

echo "Deleting cluster if exists..."
kind delete cluster --name conjur-intro-k8s-follower || true
echo "Creating cluster..."
export KIND_EXPERIMENTAL_DOCKER_NETWORK=dap_net
kind create cluster --config kind-config.yaml --wait 30s

API_SERVER_URL=$(kind get --name conjur-intro-k8s-follower kubeconfig | grep server | awk '{print $2}' | sed 's/127.0.0.1/host.docker.internal/')
KUBE_OPTS="--insecure-skip-tls-verify --server=$API_SERVER_URL --context kind-conjur-intro-k8s-follower"

# we need to wait for the default service account to be created before creating any resources
# shellcheck disable=SC2086
until kubectl $KUBE_OPTS get serviceaccounts | grep -q "default"; do sleep 1; done

kubectl $KUBE_OPTS create namespace cyberark-conjur

nohup sleep infinity &
wait $!

set +e
