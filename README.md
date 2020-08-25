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

### Workflow Example

Deploy a master auto-failover cluster with custom certificates.

```sh
$ bin/dap --provision-master
$ bin/dap --import-certificates
$ bin/dap --provision-standbys
$ bin/dap --enable-auto-failover
```

Given the above, to add a follower, add data, and validate retrieval:
```sh
$ bin/dap --provision-follower
$ bin/api --load-policy-and-values
$ bin/api --fetch-secrets
```

Next, let's trigger an auto-failover event:
```
$ bin/dap --trigger-failover
```

restore cluster health:
```sh
$ bin/dap --re-enroll-standby
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
|--provision-master|action|• Starts a DAP container and Layer 4 load balancer<br>• Configures with account `default` and password `MySecretP@ss1`||
|--import-certificates|action|• Imports pre-generated 3rd-party certificates|Requires configured master|
|--provision-standbys|action|• Removes standbys if present<br>• Starts two DAP containers<br>• Generates standby seed files<br>• Configures standbys<br>• Enable Synchronous Standby|Requires configured master|
|--enable-auto-failover|action|• Configures Master cluster with auto-failover|Requires configured master and standbys|
|--provision-follower|action|• Removes follower if present<br>• Starts a DAP container and a Layer 7 load balancer<br>• Generates a follower seed<br>• Configures follower|Requires configured master|
|--upgrade-master `<version>`|action|• Removes auto-failover (if enabled)<br>• Generates a backup<br>• Stops and removes master<br>• Starts new DAP container<br>• Restores master from backup|Requires configured master|
|--trigger-failover|action|• Stops current master|Requires an auto-failover cluster|
|--create-backup|action|• Creates a backup|Requires configured master|
|--re-enroll-standby|action|• Removes former auto-failover cluster master container<br>• Starts a standby container<br>• Generates a standby seed<br>• Enrolls standby into auto-failover cluster|Requires triggered failover| 
|--restore-from-backup|action|• Removes auto-failover (if enabled)<br>• Stops and renames master<br>• Starts new DAP container<br>• Restores master from backup|
|--version `<version>`|configuration|Version of DAP to launch|
|--dry-run|configuration|Only print configuration commands|

### bin/api

`bin/api` enables some common policy and API flows.

#### Flags

|Flag|Outcome|Notes|
|-|-|-|
|--load-policy-and-values|• Authenticates<br>• Loads policy and variable values|Run against master|
|--fetch-secrets|• Authenticates<br>• Retrieves variable values|Run against follower|


## Start a single DAP instance

To start a single DAP instance:

```sh
$ bin/dap single
```

This instance runs behind an HAProxy load balancer and is available at: [https://localhost].  Login:

- Account `default`
- User: `admin`
- Password: `MySecretP@ss1`

#### Available Flags

The following flags are available with the `single` argument.

```
Usage: bin/dap single [options]

    --create-backup             Generates a backup of the Master. The backup can be found in the system/backup folder
    --dry-run                   Displays the commands that will be run, without actually running them
    --with-follower             Starts a DAP follower with a Layer 7 load balance
    -h, --help                  Shows this help message
    --stop                      Stops all containers and cleans up cached files
    -t, --tag <appliance-tag>   Starts a cluster with a particular appliance (defaults to 5.0-stable)
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

#### Available Flags

The following flags are available with the `single` argument.

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
