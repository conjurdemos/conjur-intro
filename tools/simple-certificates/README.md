# Certificate Generator

Creates certificates to mimic the PKI certificates a customer might find in their own environment.

This script will generate:
- Root key/certificate
- Intermediate key/certificate, signed by Root
- Conjur Node certificates, all signed by the Intermediate, and including `conjur-master.mycompany.local` as an altname:
    - `master-1.mycompany.local`
    - `master-2.mycompany.local`
    - `master-3.mycompany.local`
    - `master-4.mycompany.local`

### Generate
To create these certificates, navigate to this directory and run:
```
$ ./generate_certificates
```

You can now use the following certificates to configure a Conjur cluster:
- `certificates/intermediate/cert/ca-chain.cert.pem` - CA Cert
- `certificates/nodes/master-1.mycompany.local/master-1.mycompany.local.cert.pem` - Master cert
- `certificates/nodes/master-1.mycompany.local/master-1.mycompany.local.key.pem` - Master key
- `certificates/nodes/follower-1.mycompany.local/follower-1.mycompany.local.cert.pem` - Follower 1 cert
- `certificates/nodes/follower-1.mycompany.local/follower-1.mycompany.local.key.pem` - Follower 1 key
- `certificates/nodes/follower-2.mycompany.local/follower-2.mycompany.local.cert.pem` - Follower 2 cert
- `certificates/nodes/follower-2.mycompany.local/follower-2.mycompany.local.key.pem` - Follower 2 key
- `certificates/nodes/follower-3.mycompany.local/follower-3.mycompany.local.cert.pem` - Follower 2 cert
- `certificates/nodes/follower-3.mycompany.local/follower-3.mycompany.local.key.pem` - Follower 2 key
- `certificates/nodes/follower-4.mycompany.local/follower-4.mycompany.local.cert.pem` - Follower 2 cert
- `certificates/nodes/follower-4.mycompany.local/follower-4.mycompany.local.key.pem` - Follower 2 key

### Customizing
The domain can be customized by changing the following lines in `generate_certificates`:
```
# desired domain name
domain='mycompany.local'

# sub-domain of your cluster load balancer
master_cluster='conjur-master'

# names of each node in the master cluster
master_nodes=( 'conjur-master-1' 'conjur-master-2' 'conjur-master-3' 'conjur-master-4' $master_cluster)
```

Updating to the following:
```
domain='cyberark.local'
master_cluster='foo-bar'
master_nodes=( 'master' 'standby1' 'standby2' )
```
will produce signed certificates for the following domains:
- `master.cyberark.local`
- `standby1.cyberark.local`
- `standby2.cyberark.local`

with the Altname: `foo-bar.cyberark.local`
