import argparse
import os, shutil
import re

SECRETS_DIR = os.path.join(os.sep, "data", "policy", "secrets")
OUTPUT_FILE= os.path.join(SECRETS_DIR, "unpopulated-secrets.csv")

def generate_unpopulated_secrets():
    uuid_suffix = ""
    if UUID != "":
            uuid_suffix = f"-{UUID}"

    if not os.path.exists(SECRETS_DIR):
        os.makedirs(SECRETS_DIR)



    with open(OUTPUT_FILE, 'w') as f:
      print("resource_id", file=f)
      for i in range(1, LOB_COUNT + 1):
          for j in range(1, SAFE_COUNT + 1):
              for k in range(1, ACCOUNT_COUNT + 1):
                  for l in range(1, SECRETS_PER_ACCOUNT + 1):
                      print(f"{CONJUR_ACCOUNT}:variable:AutomationVault/lob-{i}/safe-{j}/account-{k}{uuid_suffix}/variable-{l}{uuid_suffix}", file=f)


def main():
    parser = argparse.ArgumentParser(description='Generate Conjur Policy')
    parser.add_argument('--uuid', required=False, help='UUID for the policy')
    parser.add_argument('--conjur_account', required=True, help='Conjur account name')
    parser.add_argument('--account_count', type=int, required=True, help='Number of accounts per safe')
    parser.add_argument('--secrets_per_account', type=int, required=True, help='Number of secrets per account')
    parser.add_argument('--lob_count', type=int, required=True, help='Number of lobs')
    parser.add_argument('--safe_count', type=int, required=True, help='Number of safes')
    args = parser.parse_args()

    global UUID, CONJUR_ACCOUNT, LOB_COUNT, ACCOUNT_COUNT, SECRETS_PER_ACCOUNT, SAFE_COUNT

    UUID = args.uuid
    CONJUR_ACCOUNT = args.conjur_account
    LOB_COUNT = args.lob_count
    ACCOUNT_COUNT = args.account_count
    SECRETS_PER_ACCOUNT = args.secrets_per_account
    SAFE_COUNT = args.safe_count

    if UUID != "":
        print("UUID: ", UUID)

    print("Conjur Account: ", CONJUR_ACCOUNT)
    print("Total LOBs: ", LOB_COUNT)
    print("Total Safes per LOB: ", SAFE_COUNT)
    print("Total Accounts per Safe: ", ACCOUNT_COUNT)
    print("Total Secrets per Account: ", SECRETS_PER_ACCOUNT)

    generate_unpopulated_secrets()


if __name__ == '__main__':
    main()
