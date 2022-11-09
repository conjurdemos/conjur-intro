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

# Cleanup
./bin/dap --stop
```

## My POC

Uses the same image, different policy...

```bash
./bin/dap --provision-master
./bin/cli conjur policy load root /src/cli/policy/bench/lobs.yml
./bin/cli conjur policy load root /src/cli/policy/bench/hosts.yml | tee hosts01.json

docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-1"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-2"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-3"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-4"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-5"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-6"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-7"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-8"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-9"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-10"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-11"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-12"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-13"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-14"
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-15"

# Load selective replication policies
./bin/cli conjur policy load root /src/cli/policy/bench/replication-sets.yml

# This is a safe that is NOT included ein a replica set
./bin/cli conjur policy load root /src/cli/policy/bench/example-safe-1.yml | tee hosts02.json

# Set secrets to replication sets
./bin/cli conjur variable values add "vault-synchronizer/lob-1/safe-1/variable-1" "should-be-replicated"
./bin/cli conjur variable values add "example-safe-1/variable-1" "DO-NOT-REPLICATE"

# Provision follower
./bin/dap --provision-follower --replication-set replication-set-1

# Fetch secrets from leader
./bin/cli conjur variable value vault-synchronizer/lob-1/safe-1/variable-1
./bin/cli conjur variable value example-safe-1/variable-1

# Fetch secrets from follower
# should fail
./bin/follower-cli conjur variable value example-safe-1/variable-1
# should succeed
./bin/follower-cli conjur variable value vault-synchronizer/lob-1/safe-1/variable-1

# verify trigger works (check logs)
./bin/cli conjur policy load root /src/cli/policy/bench/example-safe-2.yml | tee hosts03.json

# Cleanup
./bin/dap --stop
```