FROM ubuntu:latest

# Install dependencies
RUN apt-get update -y && \
    apt-get install -y apt-transport-https ca-certificates curl gnupg2 software-properties-common wget jq gettext-base

# Install yq
RUN wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/bin/yq && \
    chmod +x /usr/bin/yq

# Install Go 1.22.1
RUN wget https://go.dev/dl/go1.22.1.linux-amd64.tar.gz && \
    tar -xf go1.22.1.linux-amd64.tar.gz && \
    mv go /usr/local/
ENV GOROOT=/usr/local/go
ENV GOPATH=/root/go
ENV PATH=$GOPATH/bin:$GOROOT/bin:$PATH

# Install KinD
RUN go install sigs.k8s.io/kind@v0.20.0

# Install Docker client
RUN curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo "$ID")/gpg | apt-key add - && \
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") $(lsb_release -cs) stable" && \
    apt-get update && \
    apt-get install -y docker-ce && \
    rm -rf /var/lib/apt/lists/*

# Install kubectl CLI
ARG KUBECTL_VERSION
RUN curl -LO https://dl.k8s.io/release/v"${KUBECTL_VERSION:-1.21.3}"/bin/linux/amd64/kubectl && \
    mv kubectl /usr/local/bin/kubectl && \
    chmod +x /usr/local/bin/kubectl

# Install Helm CLI
ARG HELM_CLI_VERSION
RUN curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 && \
    chmod 700 get_helm.sh && \
    ./get_helm.sh --no-sudo --version ${HELM_CLI_VERSION:-v3.5.2}

WORKDIR /
ADD entrypoint.sh ./
RUN chmod +x ./entrypoint.sh
ENTRYPOINT [ "./entrypoint.sh" ]
