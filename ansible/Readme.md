# Ansible Provisioning and Configuration

This is a proof-of-concept using Ansible to handle Host provisioning and DAP cluster configuration.

## Prerequisites

This example requires Ansible is installed locally.  Install with Brew via:

```sh
brew install ansible
```

or  

```sh
brew upgrade ansible
```

to get the latest and greatest.

## Provisioning

Provisioners are responsible for provisioning the required infrastructure to run a DAP deployment.  This includes a master cluster (master and two or more standbys), and a follower cluster.

### Docker

#### Single Master w/ Load Balancer

```sh
ansible-playbook provisioners/docker/master-single.yml
```

#### Master Cluster w/ Load Balancer

```sh
ansible-playbook provisioners/docker/master-cluster.yml
```

## Configurators

Configurators are responsible for configuring DAP containers into the desired end state. They operate with no awareness of the environment DAP is being run in.

### Configure Master

```sh
ansible-playbook configurators/master.yml --inventory docker-hosts.yml
```

### Configure Standbys

```sh
ansible-playbook configurators/standbys.yml --inventory docker-hosts.yml
```
