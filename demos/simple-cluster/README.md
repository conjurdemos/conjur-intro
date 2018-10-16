# Cluster Demo

This script configures a Conjur cluster with a master, follower and standby. To
run this demo, you'll need the following installed:

- Docker
- Conjur Appliance Image
- Bash

To stand up a cluster, run:
```
$ ./start
```

Navigate to [localhost](https://localhost) and login with the username: `admin`
and the password: `secret`.

Navigate to the cluster page to see your cluster.

## Master Key Encryption
To configure a cluster using a master key:

```
$ ./start --master-key
```

## Master Key Encryption and Custom Certificates
To configure a cluster using master key encryption and custom certificates:

```
$ ./start --master-key --custom-certs
```
