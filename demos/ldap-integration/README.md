# LDAP Integration Demo
This script configures a Conjur cluster with a master and follower. The Conjur cluster
is integration with LDAP using LDAP sync and authentication over SSL.

This script does not configure a high availability cluster.

### Requirements

To run this demo, you'll need the following installed:

- Docker
- Docker Composes
- Access to the Conjur Docker repository (or the Conjur Appliance Image locally)
- Bash

### Provision a Cluster

To view all options available, run the following:

```
$ ./start --help

Provisions a Conjur cluster locally, using Docker.

Usage: start [options]

    -h, --help        Shows this help message.

```

#### Basic

To stand up a simple cluster, without Master Key encryption, custom certificates, or sample data, run:
```
$ ./start
```

### Logging into your Cluster
Navigate to [localhost](https://localhost) and login with the username: `admin`
and the password: `secret`.
