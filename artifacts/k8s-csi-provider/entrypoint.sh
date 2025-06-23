#!/bin/bash

set -e

export KIND_EXPERIMENTAL_DOCKER_NETWORK=dap_net
export CLUSTER_NAME=conjur-intro-csi-provider

cleanup() {
  echo "Cleaning up..."
  kind delete cluster --name $CLUSTER_NAME
}

trap cleanup SIGINT SIGTERM

echo "Deleting cluster if exists..."
kind delete cluster --name $CLUSTER_NAME || true
echo "Creating cluster..."

kind create cluster --name $CLUSTER_NAME

kind_cid="$(docker inspect --format="{{.Id}}" $CLUSTER_NAME-control-plane)"
kind_ip="$(dirname "$(docker network inspect $KIND_EXPERIMENTAL_DOCKER_NETWORK | yq ".[0][\"Containers\"][\"$kind_cid\"][\"IPv4Address\"]")")"
kind_port="$(dirname "$(docker port $CLUSTER_NAME-control-plane)")"
kubectl config set clusters.kind-$CLUSTER_NAME.server "https://$kind_ip:$kind_port"
kubectl config use-context kind-$CLUSTER_NAME

nohup sleep infinity &
wait $!

set +e
