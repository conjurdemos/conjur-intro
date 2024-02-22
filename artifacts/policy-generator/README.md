# Purpose

The purpose of [policy-generator.py](./policy-generator.py) is to be able to
generate production quality Conjur Policy at scale. This policy structure
is aligned to what the Vault Synchronizer loads into Conjur during the
synchronization process.

# Usage

```bash
docker compose run --build --rm policy-generator python3 policy-generator.py \
  --account_count 10 \
  --secrets_per_account 2 \
  --lob_count 10 \
  --safe_count 50 \
  --host_count 100 \
  --user_count 200
    
# output
Total LOBs:  10
Total Safes per LOB:  50
Total Accounts per Safe:  10
Total Secrets per Account:  2
Total Secrets:  10000
Total Hosts:  100
Total Users:  200
Writing LOBs Policy to:  lobs.yml
Writing Users Policy to:  users.yml
Writing Hosts Policy to:  hosts.yml
Writing Safes Manifest to:  safes.json
```
