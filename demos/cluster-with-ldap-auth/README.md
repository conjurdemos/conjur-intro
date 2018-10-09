# Conjur Cluster with UI LDAP Authentication

This tutorial will run through the process of setting up a Conjur Cluster with manual failover. The Conjur UI will be configured so that users can ONLY log into the UI using their LDAP credentials.

In this example, we'll enable LDAP authentication on both the master and standby. This will allow us to fail over to the standby in the event the master is no longer available, and insure users can authenticate with LDAP to the newly promoted master.  Additionally, we'll configure the UI to use our configured LDAP authenticator. This will insure that only enabled users with LDAP credentials are able to log into the UI.

### LDAP Authenticator
Conjur ships with a number of authenticators, including LDAP. Authenticators are designed to provide organizations the ability to leverage existing, trusted authentication sources to authenticate users and hosts to Conjur. Authenticators are designed to be flexible. Conjur can be configured with one or more authenticators. One or more of the same authenticators can also be configured, each with a unique name.

In order for an authenticator to be available on a Conjur node, it needs:

1. An authentication policy, which defines the authenticator.
2. The authenticator to be enabled (which happens using environment variables).


#### LDAP Authentication Policy
This allows authenticators to be configured on a per-node basis. This is important for limiting node authentication.  For example, we might want to use LDAP authentication to authenticate to the Conjur master, and to access the UI, but we want followers running inside a particular Open Shift cluster to only allow authentication to pods within that Open Shift cluster.

To start with, let's look at a sample LDAP authenticator policy:

```yml
- !policy
  id: conjur/authn-ldap/production
  body:
  - !webservice

  - !group clients

  - !permit
    role: !group clients
    privilege: [ read, authenticate ]
    resource: !webservice
```

Let's look at what's going on here, starting with the id: `conjur/authn-ldap/production`. This creates an LDAP authenticator (because it specifies `authn-ldap`), in the `conjur` namespace, called `production`. Alternatively, `production` could be anything you choose.  If the ID is `conjur/authn-ldap/foo-bar`, our LDAP authenticator would be `foo-bar`.

Next, in this policy, we create a webservice as well as group called `clients`.  We then give our group `clients` read and authenticate permission to our webservice. This will allow any users that are members of the `conjur/authn-ldap/production/clients` group to authenticate using this LDAP authenticator.

##### Authenticator Environment Variables
In addition to an authentication policy like the above, we still need to configure our Conjur node to enable our authenticator. This can be done by setting the following environment variable:

```
CONJUR_AUTHENTICATORS="authn-ldap/production"
```

Multiple authenticators can be enabled listing multiple authenticators in a comma seperated list:

```
CONJUR_AUTHENTICATORS="authn,authn-ldap/production"
```

In the above example, `authn` is the default, built in Conjur authenticator. The above configuration would allow a user to authenticate using their Conjur credentials or using their LDAP credentials.

When configuring Conjur for LDAP authentication, we need to provide a couple of additional environment variables in order to for the authenticator to connect securely to our LDAP server. These environment variables are as follows:

```
LDAP_URI="ldap://authn-ldap-server:389"
LDAP_BASE="dc=conjur,dc=net"
LDAP_FILTER="(uid=%s)"
LDAP_BINDDN="cn=admin,dc=conjur,dc=net"
LDAP_BINDPW="ldapsecret"
```

### UI LDAP Login
The Conjur UI utilizes the Conjur API to authenticate and retrieve any information that show on a particular page. By default, the Conjur UI will try to authenticate with the default Conjur API authentication endpoint: `/authn`.

Because we want our UI to use the LDAP authenticator, we need to set the UI Authentication endpoint to the LDAP authenticator above: `authn-ldap/production`.  We can do this by setting the following environment variable on our Master and Standbys:

```
AUTHN_URL="https://conjur-master.mycompany.local/authn-ldap/production"
```

### Starting Conjur
Now that we know how to configure an authenticator policy and set the required environment variables, let's provision our cluster:

```
# On our Master server
$ docker run \
  -e CONJUR_AUTHENTICATORS="authn,authn-ldap/production" \
  -e AUTHN_URL="https://conjur-master.mycompany.local/authn-ldap/production" \
  -e LDAP_URI="ldap://authn-ldap-server:389" \
  -e LDAP_BASE="dc=conjur,dc=net" \
  -e LDAP_FILTER="(uid=%s)" \
  -e LDAP_BINDDN="cn=admin,dc=conjur,dc=net" \
  -e LDAP_BINDPW="ldapsecret" \
  -p 443 -p 5432 -p 1999 \
  -n conjur \
  registry2.itci.conjur.net/conjur-appliance:5.0-stable

$ docker exec conjur evoke configure master \
  -h conjur-master.mycompany.local \
  -p secret demo

$ docker exec -it conjur evoke seed standby conjur-standby.mycompany.local > /tmp/standby-seed.tar
$ docker exec -it conjur evoke seed follower conjur-follower-1.mycompany.local > /tmp/follower-seed.tar
```

Now let's copy the follower and standby seeds to the follower and standby servers:
```
# On our Master server
$ scp user@conjur-follower-1.mycompany.local...
$ scp user@conjur-follower-1.mycompany.local...
```

Next, we'll configure our standby:
```
# On our Standby servers
$ docker run \
  -e CONJUR_AUTHENTICATORS="authn,authn-ldap/production" \
  -e AUTHN_URL="https://conjur-master.mycompany.local/authn-ldap/production" \
  -e LDAP_URI="ldap://authn-ldap-server:389" \
  -e LDAP_BASE="dc=conjur,dc=net" \
  -e LDAP_FILTER="(uid=%s)" \
  -e LDAP_BINDDN="cn=admin,dc=conjur,dc=net" \
  -e LDAP_BINDPW="ldapsecret" \
  -p 443 -p 5432 -p 1999 \
  -n conjur \
  registry2.itci.conjur.net/conjur-appliance:5.0-stable

$ docker exec -it conjur evoke unpack seed /tmp/standby-seed.tar
$ docker exec -it conjur evoke configure standby
```

And finally, we'll configure our follower:
```
# On our follower servers
$ docker run \
  -p 443 \
  -n conjur \
  registry2.itci.conjur.net/conjur-appliance:5.0-stable


$ docker exec -it conjur evoke unpack seed /tmp/follower-seed.tar
$ docker exec -it conjur evoke configure follower
```

Astute readers will notice we have not provided an authenticator for our Follower. By default, a Conjur node is enabled with the built in authenticator (validates hosts and users based on their provided Conjur credentials).


# TODO
- Authn-ldap connection information is stored in Conjur (variables are set using the CLI).
- Disable UI on follower(s)
