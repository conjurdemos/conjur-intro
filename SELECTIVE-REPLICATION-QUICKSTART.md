# Purpose

Demonstrating Selective Replication.

## Micah's POC

> Note: this is done using only follower.

This is using the image provided from this [confluence document](https://ca-il-confluence.il.cyber-ark.com/display/rndp/Selective+Replication+-+Documentation+-+Quickstart+Demo).

```bash
./bin/dap --provision-master
./bin/cli conjur policy load root /src/cli/policy/selective-replication-poc/app.yml

docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "us"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "eu"

# Load selective replication policies
./bin/cli conjur policy load root /src/cli/policy/selective-replication-poc/permit-eu-replication.yml
./bin/cli conjur policy load root /src/cli/policy/selective-replication-poc/permit-us-replication.yml

# Set secrets to replication sets
./bin/cli conjur variable values add "full-only" "full-data"
./bin/cli conjur variable values add "eu-only" "eu-data"
./bin/cli conjur variable values add "us-only" "us-data"

# Provision follower
./bin/dap --provision-follower --replication-set us

# Fetch secrets from leader
./bin/cli conjur variable value "full-only"
./bin/cli conjur variable value "eu-only"
./bin/cli conjur variable value "us-only"

# Fetch secrets from follower
# should fail
./bin/follower-cli conjur variable value "full-only"
./bin/follower-cli conjur variable value "eu-only"
# should succeed
./bin/follower-cli conjur variable value "us-only"
```

## My POC

Uses the same image, different policy...
