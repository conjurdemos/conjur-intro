# Keycloak (Quarkus distribution) with curl and jq added for the helper scripts in this directory.
# The same image as in conjur-cli-go, conjur-api-ruby and the other repositories.
# The tag is unpinned on purpose, like there, so that every repository tests against the same Keycloak.
FROM registry.access.redhat.com/ubi9 AS ubi-micro-build
RUN mkdir -p /mnt/rootfs
RUN dnf install --installroot /mnt/rootfs jq curl --releasever 9 --setopt install_weak_deps=false --nodocs -y && \
    dnf --installroot /mnt/rootfs clean all && \
    rpm --root /mnt/rootfs -e --nodeps setup

FROM quay.io/keycloak/keycloak
COPY --from=ubi-micro-build /mnt/rootfs /
WORKDIR /opt/keycloak
RUN keytool -genkeypair -storepass password -storetype PKCS12 -keyalg RSA -keysize 2048 \
      -dname "CN=keycloak" -alias server -ext "SAN:c=DNS:keycloak,DNS:localhost" \
      -keystore conf/server.keystore
RUN /opt/keycloak/bin/kc.sh build
EXPOSE 8080 8443
# The hostname is derived from the request, so the issuer of a token is the URL it was requested from
# (http://keycloak:8080 inside the Docker network, https://keycloak:8443 for the OIDC authenticator).
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start", "--http-port=8080", "--https-port=8443", \
  "--https-key-store-file=/opt/keycloak/conf/server.keystore", "--https-key-store-password=password", \
  "--hostname-strict=false", "--http-enabled=true"]
