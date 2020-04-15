# Conjur Intro
Tools and scripts  utilities that make it easier to make, manage, and run demos

## Demos

- [AWS Cluster](demos/aws-cluster/README.md)
- [Conjur Cluster](demos/cluster/README.md)
- [Certificate Authority](demos/certificate-authority/mutual-tls/README.md)
- [LDAP Sync and Authentication](demos/ldap-integration/README.md)

## Tools
- [Generate Signed Certificates](tools/simple-certificates/)

## Instructions

### `./start`
`start` provides a dead simple mechanism for starting a DAP Appliance.

Start a V5 appliance master with:
```sh
$ ./start
```
The start command pulls down the latest version of the V5 appliance and CLI, and configures DAP with the following:
* Account: `demo`
* Admin password: `MySecretP@ss1`

Once started, logs are streamed to the console.

`ctr-c` stops the appliance, and cleans up the environment.

#### Start Flags

The `start` script accepts the following flags:
```
SYNOPSIS
    start [global options]

GLOBAL OPTIONS
    -h, --help                          - Show this message

    --skip-pull                         - Does not pull a fresh Conjur master before starting

    -t, --tag <appliance-tag>           - Starts a Conjur Appliance of the version specified

    --with-config                       - Configures the Appliance using the `config/conjur.json` file
```

To run a particular version of the Appliance:
```
$ ./start --tag 5.2.0
```

To start Conjur with the configuration file found in `./config/conjur.json`:
```
$ ./start --with-config
```

### `./cli`
`cli` is a proxy script, sending all subsequent arguments to a Conjur CLI container. This provides a simple mechanism for loading policy and interacting with Conjur.

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

## Contributing

We welcome contributions of all kinds to this repository. For instructions on
how to get started and descriptions of our development workflows, please see our
[contributing guide](CONTRIBUTING.md).

## License

This repository is licensed under Apache License 2.0 - see [`LICENSE`](LICENSE) for more details.
