# Policy Generator  

The purpose of [policy-generator.py](./policy-generator.py) is to be able to
generate production quality Conjur Policy at scale. This policy structure
is aligned to what the Vault Synchronizer loads into Conjur during the
synchronization process.

## Example of usage

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
```

## Calculating final number of secrets
Total number of secrets is simply a product of all these parameters:
* lob_count
* safe_count
* account_count
* secrets_per_account

## Creating big sets of data
When creating a lot of secrets you need to keep in mind that policy-generator will generate many temporary files.
The higher the number of LOBs and Safes, the more temporary files will be created. And the higher the number of
accounts and secrets per account the bigger the files will be.

Exemplary command to generate a million of secrets could look like this:
```bash
docker compose run --build --rm policy-generator python3 policy-generator.py \
--account_count 500 \
--secrets_per_account 5 \
--lob_count 10 \
--safe_count 40 \
--host_count 100 \
--user_count 200
```

## Limitations

### Conjur policy size
Due to the Conjur limit on the size of a single policy load each generated *.yml file can't exceed 10MB.
This translates to an upper limit of around 20k secrets (e.g. 10k accounts and 2 secret per account)
declared in a single lob-{lob_id}_safe-{safe_id}.yml file.
