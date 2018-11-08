# Cluster Demo

This script configures a high availability Conjur cluster with a master, follower and standby.

Optionally, clusters can be configured with any or all of the following:

- Sample data
- Master Key encryption
- Custom third party certificates
- Particular Conjur version

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

    --auto-failover     Configures the cluster for auto-failover
    --custom-certs      Installs custom certificates from the "files/certs" folder
    -h, --help          Shows this help message.
    --load-data         Loads sample policy along once th cluster
    --master-key        Encrypts certificates using a master key
    --tag <conjur-tag>  Starts a cluster with a particular appliance (defaults to 5.0-stable)

```

#### Basic

To stand up a simple cluster, without Master Key encryption, custom certificates, or sample data, run:
```
$ ./start
```

#### Master Key Encryption
To configure a cluster with encrypted certificates using a master key:

```
$ ./start --master-key
```

#### Custom Certificates
To configure a cluster using custom certificates:

```
$ ./start --custom-certs
```

#### Sample Data
To load a configured cluster with sample data:
```
$ ./start --load-data
```

#### Run a cluster with a particular Conjur version
To run a particular version of Conjur, pass the image tag in with the `--tag` flag:

```
$ ./start --tag 5.2.2-20181029194559-7305fae
```

#### Master Key Encryption, Custom Certificates
Flags can be combined to provide combinations of these actions. Below is an example of how to configure a cluster with custom certificates, encrypted with a master key, and load sample data into the cluster:

```
$ ./start --master-key --custom-certs --load-data
```

### Logging into your Cluster
Navigate to [localhost](https://localhost) and login with the username: `admin`
and the password: `secret`.

## Trigger Failover
A failover can be triggered using the `failover` script.  This script stops the current master, causing a failover to occur. The former master is then rebuilt and re-added to the cluster.

**Note** This script can only be run once.

#### Failover an Encrypted Node
To failover a master node that's been configured with Master Key encryption:
```
$ ./failover --master-key
```

#### Failover an Unencrypted Node
To failover a master node that has not been encrypted with a master key:
```
$ ./failover
```
