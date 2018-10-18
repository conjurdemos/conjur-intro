# Simple Cluster Demo

This script configures a high availability Conjur cluster with a master, follower and standby. This script does not configure the cluster to be an auto-failover cluster. 

Optionally, clusters can be configured with any or all of the following:

- Sample data
- Master Key encryption
- Custom third party certificates


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

    --custom-certs    Installs custom certificates from the "files/certs" folder
    --load-data       Loads sample policy along once th cluster
    --master-key      Encrypts certificates using a master key
    -h, --help        Shows this help message.

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

#### Master Key Encryption, Custom Certificates
Flags can be combined to provide combinations of these actions. Below is an example of how to configure a cluster with custom certificates, encrypted with a master key, and load sample data into the cluster:

```
$ ./start --master-key --custom-certs  --load-data
```

### Logging into your Cluster
Navigate to [localhost](https://localhost) and login with the username: `admin`
and the password: `secret`.
