# Conjur Intro
Tools and scripts  utilities that make it easier to make, manage, and run demos

## Demos

- [AWS Cluster](demos/aws-cluster/README.md)
- [Conjur Cluster](demos/cluster/README.md)
- [Certificate Authority](demos/certificate-authority/mutual-tls/README.md)
- [LDAP Sync and Authentication](demos/ldap-integration/README.md)

## Tools
- [Generate Signed Certificates](tools/simple-certificates/)
- [JMeter Performance Tests](tools/performance-tests/)

## Instructions

### bin/dap
`bin/dap` provides a dead simple mechanism for starting DAP in a variety of configurations and workflows. It provides visibility into the commands required to perform various workflows.

## Start a single DAP instance

To start a single DAP instance:

```sh
$ bin/dap single
```

This instance runs behind an HAProxy load balancer and is available at: [https://localhost].  Login:

- Account `default`
- User: `admin`
- Password: `MySecretP@ss1`

#### Available Operations

To perform additional operations on the instance, run the `single` command again
with one of the following flags:

```
Usage: bin/dap single [options]

    --create-backup             Generates a backup of the Master. The backup can be found in the system/backup folder
    --dry-run                   Displays the commands that will be run, without actually running them
    --with-follower             Starts a DAP follower with a Layer 7 load balance
    -h, --help                  Shows this help message
    --stop                      Stops all containers and cleans up cached files
    -t, --tag <appliance-tag>   Starts a cluster with a particular appliance (defaults to 5.0-stable)
```

For example:

```sh
$ bin/dap single --create-backup
```

## Start a DAP Cluster

To start a basic HA DAP cluster (self-signed certificates, no Master Key encryption) and a Follower:

```sh
$ bin/dap cluster
```

This cluster runs behind an HAProxy load balancer and is available at: [https://localhost].  Login:

- Account `default`
- User: `admin`
- Password: `MySecretP@ss1`

#### Available Operations

To perform additional operations on the cluster, run the `cluster` command again
with one of the following flags:

```
Usage: bin/dap cluster [options]

    --create-backup             Generates a backup of the Master. The backup can be found in the system/backup folder
    --dry-run                   Displays the commands that will be run, without actually running them
    --enable-auto-failover      Enrolls nodes into and auto-failover cluster
    -h, --help                  Shows this help message
    --promote-standby           Stops the Master and promotes the first Standby as the new Master
    --stop                      Stops all containers and cleans up cached files
    -t, --tag <appliance-tag>   Starts a cluster with a particular appliance (defaults to 5.0-stable)
```

For example:

```sh
$ bin/dap cluster --create-backup
```

### `bin/cli`
`bin/cli` is a proxy script, sending all subsequent arguments to a Conjur CLI container. This provides a simple mechanism for loading policy and interacting with Conjur.

#### Loading policy
The policy folder contains sample policy which can be loaded with:
```sh
$ ./cli conjur policy load --replace root policy/users.yml
$ ./cli conjur policy load root policy/policy.yml
$ ./cli conjur policy load staging policy/apps/myapp.yml
$ ./cli conjur policy load production policy/apps/myapp.yml
$ ./cli conjur policy load root policy/application_grants.yml
$ ./cli conjur policy load root policy/hosts.yml
```

#### Setting/Retrieving a Variable
```
./cli conjur variable values add production/myapp/database/username my-username
./cli conjur variable values add production/myapp/database/password my-password
./cli conjur variable values add production/myapp/database/url https://my-database.mycompany.com
./cli conjur variable values add production/myapp/database/port 5432
```

#### Validating Packages
This project can also be used to verify PRs, by installing the branch specific package (created by Jenkins).  To begin, download the `.deb` package.  After starting Conjur, packages can be installed with:

```
# Start Conjur
$ ./start
```
Next in a new tab:

```
$ ./install ~/Downloads/conjur-ui_2.10.9.1-e389f20_amd64.deb
```
The install script will install the package into the running Conjur appliance and restart the Conjur service.

## Performance Tests
```
# Start tests
$ ./performance_test/start.sh
```
More information can be found [here](./performance_test/README.md#jmeter-performance-test)

## Contributing

We welcome contributions of all kinds to this repository. For instructions on
how to get started and descriptions of our development workflows, please see our
[contributing guide](CONTRIBUTING.md).

## License

This repository is licensed under Apache License 2.0 - see [`LICENSE`](LICENSE) for more details.
