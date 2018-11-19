# Certificate Generator

Creates certificates to mimic the PKI certificates a customer might find in their own environment.

This script will generate:
- Root CA key/certificate
- Any intermediate CA key(s)/certificate(s), signed by the previous CA in the chain
- Conjur Node certificates, all signed by the Intermediate:
    - `master-1.mycompany.local`
    - `master-2.mycompany.local`
    - `master-3.mycompany.local`
    - `follower-1.mycompany.local`
    - `follower-2.mycompany.local`
  - You may override these leaf certificates with parameters from the CLI.

### Generate
To create these certificates, navigate to this directory and run:
```
$ ./generate_certificates <number_of_intermediate_CAs> [node_name...]
```

You can now use the following certificates to configure a Conjur cluster:
- `certificates/intermediate/cert/ca-chain.cert.pem` - CA Cert
- `certificates/nodes/master-1.mycompany.local/master-1.mycompany.local.cert.pem` - Master cert
- `certificates/nodes/master-1.mycompany.local/master-1.mycompany.local.key.pem` - Master key
- `certificates/nodes/follower-1.mycompany.local/follower-1.mycompany.local.cert.pem` - Follower 1 cert
- `certificates/nodes/follower-1.mycompany.local/follower-1.mycompany.local.key.pem` - Follower 1 key
- `certificates/nodes/follower-2.mycompany.local/follower-2.mycompany.local.cert.pem` - Follower 2 cert
- `certificates/nodes/follower-2.mycompany.local/follower-2.mycompany.local.key.pem` - Follower 2 key

### Customizing

#### Nodes

Nodes can be changed with addition of the server names to the CLI args:
```
$ ./generate_certificates 2 foo bar baz
```

This example will create the following certs:
- Root CA
- Intermediate CA Certs
  - Intermediate 1
  - Intermediate 2
- Leaf nodes
  - foo.mycompany.local
  - bar.mycompany.local
  - baz.mycompany.local

#### Domain name

The domain can be customized by changing the following lines in `generate_certificates`:
```
DOMAIN_NAME='mycompany.local'
```

Updating to the following:
```
DOMAIN='cyberark.local'
```
will produce signed certificates similar to these for the following domains:
- `master.cyberark.local`
- `follower1.cyberark.local`
- `follower2.cyberark.local`
