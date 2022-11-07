# Purpose

```bash
# Run the following from the root of: conjur-intro
./bin/dap --provision-master
./bin/cli conjur policy load root /src/cli/policy/bench/lobs.yml

# create replication set b/c we have refs to the replication set data group
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-1"

./bin/dap --provision-follower
./bin/cli conjur policy load root /src/cli/policy/bench/hosts.yml | tee hosts01.json

./bin/cli conjur variable values add "vault-synchronizer/lob-1/safe-1/variable-1" "should-be-replicated"
#./bin/cli conjur policy load root /src/cli/policy/bench/users.yml  | tee users01.json
#./bin/cli conjur policy load root /src/cli/policy/bench/example-safe.yml
# ./bin/cli conjur policy load root /src/cli/policy/bench/15000-secrets/lobs.yml
# ./bin/cli conjur policy load root /src/cli/policy/bench/15000-secrets/hosts.yml | tee hosts01.json
# ./bin/cli conjur policy load root /src/cli/policy/bench/15000-secrets/users.yml  | tee users01.json
# Load an example policy

# IMPORTANT:
# - replication-set-1..N must exist prior to loading replication-sets policy
#
docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-1"

# for i in $(seq 1 15);
# do
#   docker exec conjur-intro-conjur-master-1.mycompany.local-1 evoke replication-set create "replication-set-$i"
# done

# Populate the secrets to be replicated
./bin/cli conjur variable values add "vault-synchronizer/lob-1/safe-1/variable-1" "should-be-replicated"

# for i in $(seq 1 50); do
#   ./bin/cli conjur variable values add "vault-synchronizer/lob-1/safe-1/variable-$i" "should-be-replicated"
# done

# Populate an example secret (non-replicated)
./bin/cli conjur variable values add "example-safe/hex32-1" "DO-NOT-REPLICATE"

# Load our replication set policy
#
# WARNING: at least 1 secret later be designated to a replica set
# MUST have a value set exist in the database before we can load a policy that
# declares a grant as follows:
#
# - !grant
#   role: !layer replication-set-1-vault-synchronizer-hosts-lob-1-safe-1-hosts
#   member: !group
#     account: system
#     id: /conjur/replication-sets/replication-set-1/replicated-data
#
# OUTPUT:
# {"error":{"code":"not_found","message":"Group 'conjur/replication-sets/replication-set-1/replicated-data' not found in account 'system'","target":"group","details":{"code":"not_found","target":"id","message":"system:group:conjur/replication-sets/replication-set-1/replicated-data"}}}
# error: 404 Not Found
./bin/cli conjur policy load root /src/cli/policy/bench/replication-sets.yml

# List all resources (NOTE: resources under the internal /conjur policy node are not displayed here intentionally!)
./bin/cli conjur list | tee conjur-list01.log

# To view /conjur policy objects (created internally via Selective Replication
# config), run the following:
docker exec -it conjur-intro-conjur-master-1.mycompany.local-1 bash
su conjur
psql
select * from resources WHERE resource_id LIKE '%conjur%';

# Provision a Follower using this replica set (see ./bin/dap for hard-coded change)
./bin/dap --provision-follower

# Fetch a replicated secret from the leader (should succeed, http 200)
./bin/cli conjur variable value vault-synchronizer/lob-1/safe-1/variable-1
./bin/cli conjur variable value example-safe/hex32-1

# Fetch a replicated secret from the follower (should succeed, http 200)
./bin/follower-cli conjur variable value vault-synchronizer/lob-1/safe-1/variable-1

# Fetch a non-replicated secret from follower (should fail, http 404)
./bin/follower-cli conjur variable value example-safe/hex32-1

# To view conjur policy objects in the follower:
docker exec -it conjur-intro-conjur-follower-1.mycompany.local-1 bash
su conjur
psql
select * from resources WHERE resource_id LIKE '%conjur%';

# Cleanup
./bin/dap --stop
```