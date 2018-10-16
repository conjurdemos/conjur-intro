#!/bin/bash -ex

ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' simple-cluster_conjur-master_1)

echo "ip: $ip"
