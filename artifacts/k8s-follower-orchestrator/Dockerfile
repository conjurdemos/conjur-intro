ARG K8S_FOLLOWER_TAG

FROM registry.tld/cyberark/conjur-kubernetes-follower-operator-manifests:$K8S_FOLLOWER_TAG AS operator-manifests

FROM golang:alpine

ARG K8S_FOLLOWER_TAG
ARG CONJUR_K8S_FOLLOWER_PORT
ARG FOLLOWER_COUNT

RUN apk add docker-cli kubectl curl jq && \
    go install sigs.k8s.io/kind@v0.20.0

WORKDIR /

COPY kind-config.yaml entrypoint.sh conjur-follower-node-port.yaml ./

# Replace port forwarded from K8S-Follower to host
RUN sed -i "s/hostPort: 451/hostPort: ${CONJUR_K8S_FOLLOWER_PORT}/g" kind-config.yaml

COPY --from=operator-manifests /manifests /manifests/operator
# Replace image version in form <version-tag> with either specified by user or default (edge)
RUN sed -i "s/conjur-kubernetes-follower-operator:.*/conjur-kubernetes-follower-operator:${K8S_FOLLOWER_TAG}/g" /manifests/operator/operator.yaml
# Replace ImagePullPolicy: Always with ImagePullPolicy: Never
RUN sed -i "s/default: Always/default: Never/g" /manifests/operator/crds.yaml
RUN sed -i "s/imagePullPolicy: Always/imagePullPolicy: Never/g" /manifests/operator/operator.yaml

COPY --from=operator-manifests /samples /manifests/samples
# Replace untagged images with specific versions
RUN sed -i "s/conjur-kubernetes-follower-configurator/conjur-kubernetes-follower-configurator:${K8S_FOLLOWER_TAG}/g" /manifests/samples/conjur_v1_conjurfollower.yaml && \
    sed -i "s/conjur-kubernetes-follower-conjur/conjur-kubernetes-follower-conjur:${K8S_FOLLOWER_TAG}/g" /manifests/samples/conjur_v1_conjurfollower.yaml && \
    sed -i "s/conjur-kubernetes-follower-info/conjur-kubernetes-follower-info:${K8S_FOLLOWER_TAG}/g" /manifests/samples/conjur_v1_conjurfollower.yaml && \
    sed -i "s/conjur-kubernetes-follower-nginx/conjur-kubernetes-follower-nginx:${K8S_FOLLOWER_TAG}/g" /manifests/samples/conjur_v1_conjurfollower.yaml && \
    sed -i "s/conjur-kubernetes-follower-postgres/conjur-kubernetes-follower-postgres:${K8S_FOLLOWER_TAG}/g" /manifests/samples/conjur_v1_conjurfollower.yaml && \
    sed -i "s/conjur-kubernetes-follower-syslog-ng/conjur-kubernetes-follower-syslog-ng:${K8S_FOLLOWER_TAG}/g" /manifests/samples/conjur_v1_conjurfollower.yaml && \
    sed -i "s/conjur-kubernetes-follower-failover-rebaser/conjur-kubernetes-follower-failover-rebaser:${K8S_FOLLOWER_TAG}/g" /manifests/samples/conjur_v1_conjurfollower.yaml

# Replace values for sample ConjurFollower
RUN sed -i 's|https://conjur.host.name/|https://host.docker.internal|g' /manifests/samples/conjur_v1_conjurfollower.yaml && \
    sed -i 's|my-authenticator-id|dev-cluster|g' /manifests/samples/conjur_v1_conjurfollower.yaml && \
    sed -i 's|conjur-master-ca.crt|conjur-cert|g' /manifests/samples/conjur_v1_conjurfollower.yaml && \
    sed -i "s|replicas: [0-9]*|replicas: ${FOLLOWER_COUNT}|g" /manifests/samples/conjur_v1_conjurfollower.yaml && \
    sed -i 's|ca.crt|conjur-master.mycompany.local.pem|g' /manifests/samples/conjur_v1_conjurfollower.yaml

ENTRYPOINT [ "./entrypoint.sh" ]
