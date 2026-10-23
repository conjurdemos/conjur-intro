FROM ubuntu:latest

# Security patches
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
      sed && \
    rm -rf /var/lib/apt/lists/*

ARG KIND_VERSION=0.29.0
ARG KUBECTL_VERSION=1.33.2

# Install dependencies
RUN apt-get update -y && \
    apt-get install -y apt-transport-https ca-certificates curl gnupg2 software-properties-common wget jq gettext-base

# Install yq
RUN wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/bin/yq && \
    chmod +x /usr/bin/yq

# Install Go
COPY --from=golang:1.27 /usr/local/go /usr/local/go
ENV GOROOT=/usr/local/go
ENV GOPATH=/root/go
ENV PATH=$GOPATH/bin:$GOROOT/bin:$PATH

# Install KinD
RUN go install sigs.k8s.io/kind@v${KIND_VERSION}

# Install Docker client
RUN . /etc/os-release && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/${ID}/gpg -o /etc/apt/keyrings/docker.asc && \
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y docker-ce && \
    rm -rf /var/lib/apt/lists/*

# Install kubectl CLI
RUN curl -LO https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl && \
    mv kubectl /usr/local/bin/kubectl && \
    chmod +x /usr/local/bin/kubectl

# Install Helm CLI
RUN curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 && \
    chmod 700 get_helm.sh && \
    ./get_helm.sh --no-sudo

WORKDIR /
ADD entrypoint.sh ./
RUN chmod +x ./entrypoint.sh
ENTRYPOINT [ "./entrypoint.sh" ]
