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

## CLI Tools

This project includes a CLI which simplifies the process of running a variety of scenarios.

### Workflow Examples

Deploy a master auto-failover cluster (behind L4 load balancer).

```sh
$ bin/dap --provision-master
$ bin/dap --provision-standbys
$ bin/dap --enable-auto-failover
```

Given the above, to add a follower (behind L7 load balancer), add data, and validate retrieval:
```sh
$ bin/dap --provision-follower
$ bin/api --load-policy-and-values
$ bin/api --fetch-secrets
```

Next, let's trigger an auto-failover event:
```sh
$ bin/dap --trigger-failover
```

Upgrade and rebuild cluster:
```sh
$ bin/dap --upgrade-master <version>
$ bin/dap --provision-standbys --version <version>
$ bin/dap --enable-auto-failover
$ bin/dap --provision-follower --version <version>
```

and finally, validate:

```sh
$ bin/api --fetch-secrets
```

***

### bin/dap
`bin/dap` provides a dead simple mechanism for starting DAP in a variety of configurations and workflows. It provides visibility into the commands required to perform various workflows.

#### Flags
|Flag|Type|Outcome|Notes|
|-|-|-|-|
|--create-backup|action|• Creates a backup|Requires configured master|
|--dry-run|configuration|Only print configuration commands|
|--enable-auto-failover|action|• Configures Master cluster with auto-failover|Requires configured master and standbys|
|--help||Shows all available arguments||
|--import-custom-certificates|action|• Imports pre-generated 3rd-party certificates|Requires configured master|
|--promote-standby|action|• Stops the current master<br>• Promotes a standby| Requires configured standbys and no auto-failover|
|--provision-follower|action|• Removes follower if present<br>• Starts a DAP container and a Layer 7 load balancer<br>• Generates a follower seed<br>• Configures follower|Requires configured master|
|--provision-master|action|• Starts a DAP container and Layer 4 load balancer<br>• Configures with account `default` and password `MySecretP@ss1`||
|--provision-standbys|action|• Removes standbys if present<br>• Starts two DAP containers<br>• Generates standby seed files<br>• Configures standbys<br>• Enable Synchronous Standby|Requires configured master|
|--restore-from-backup|action|• Removes auto-failover (if enabled)<br>• Stops and renames master<br>• Starts new DAP container<br>• Restores master from backup|Requires a previously created backup|
|--stop|action|Stops and removes all containers||
|--trigger-failover|action|• Stops current master|Requires an auto-failover cluster|
|--trust-follower-proxy|action|• Adds Follower load balancer as a trusted proxy|Requires configured follower|
|--upgrade-master `<version>`|action|• Removes auto-failover (if enabled)<br>• Generates a backup<br>• Stops and removes master<br>• Starts new DAP container<br>• Restores master from backup|Requires configured master|
|--version `<version>`|configuration|Version of DAP to use (defaults to latest)|

### bin/api

`bin/api` enables some common policy and API flows.

#### Flags

|Flag|Type|Outcome|Notes|
|-|-|-|-|
|--against-master|configuration|Runs read actions against the master||
|--authenticate-user|action|• Authenticates with default user and password<br>• Displays the resulting authentication token||
|--fetch-secrets|action|• Authenticates<br>• Retrieves variable values|Run against follower unless `--against-master` flag is present|
|--load-policy|action|• Authenticates<br>• Loads policy|Run against master|
|--load-policy-and-values|action|• Authenticates<br>• Loads policy and variable values|Run against master, equivalent to running '--load-policy' and '--set-secrets'|
|--password `<password>`|configuration|Uses a non-default password for authentication||
|--set-secrets|action|• Authenticates<br>• Sets variable values|Requires `--load-policy` before running|
|--user `<conjur-user>`|configuration|Uses a non-default (`admin`) user for authentication||

## Start a single DAP instance

To start a single DAP instance:

```sh
$ bin/dap --provision-master
```

This instance runs behind an HAProxy load balancer and is available at: [https://localhost].  Login:

- Account `default`
- User: `admin`
- Password: `MySecretP@ss1`

## Start a DAP Cluster with Follower

To start a basic HA DAP cluster (self-signed certificates, no Master Key encryption) and a Follower:

```sh
$ bin/dap --provision-master
$ bin/dap --provision-standbys
$ bin/dap --provision-follower
```

This instance runs behind an HAProxy load balancer and is available at: [https://localhost].  Login:

- Account `default`
- User: `admin`
- Password: `MySecretP@ss1`

#### Available Flags

The following flags are available:

```
Usage: bin/dap single [options]

    --create-backup               Creates a backup|Requires configured master
    --dry-run                     Print configuration commands with executing
    --enable-auto-failover        Configures Master cluster with auto-failover (Requires configured master and standbys)
    --h, --help                   Shows this help message
    --import-custom-certificates  Imports pre-generated 3rd-party certificates (Requires configured master)
    --promote-standby             Stops the current master and promotes a standby (Requires configured standbys and no auto-failover)
    --provision-follower          Configures follower behind a Layer 7 load balancer (Requires configured master)
    --provision-master            Configures a DAP Master with account `default` and password `MySecretP@ss1` behind a Layer 4 load balancer
    --provision-standbys          Deploys and configures two standbys (Requires configured master)
    --restore-from-backup         Restores a master from backup|Requires a previously created backup
    --stop                        Stops all containers and cleans up cached files
    --trigger-failover            Stops current master (Requires an auto-failover cluster)
    --trust-follower-proxy        Adds Follower load balancer as a trusted proxy (Requires a configured follower)
    --upgrade-master <version>    Restores master from backup (Requires configured master)
    --version <version>           Version of DAP to use (defaults to latest build)
```

### `bin/cli`
`bin/cli` is a proxy script, sending all subsequent arguments to a Conjur CLI container. This provides a simple mechanism for loading policy and interacting with Conjur.

#### Loading policy
The policy folder contains sample policy which can be loaded with:
```sh
$ bin/cli conjur policy load --replace root policy/users.yml
$ bin/cli conjur policy load root policy/policy.yml
$ bin/cli conjur policy load staging policy/apps/myapp.yml
$ bin/cli conjur policy load production policy/apps/myapp.yml
$ bin/cli conjur policy load root policy/application_grants.yml
$ bin/cli conjur policy load root policy/hosts.yml
```

#### Setting/Retrieving a Variable
```
bin/cli conjur variable values add production/myapp/database/username my-username
bin/cli conjur variable values add production/myapp/database/password my-password
bin/cli conjur variable values add production/myapp/database/url https://my-database.mycompany.com
bin/cli conjur variable values add production/myapp/database/port 5432
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
