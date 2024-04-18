import argparse
from jinja2 import Template
import json
import os, shutil
import re

VAULT_SYNCHRONIZER_POLICY_ID = "AutomationVault"

TEMPLATES_DIR = os.path.join(os.sep, "policy-generator", "templates")

INPUT_FILE_LOBS = os.path.join(TEMPLATES_DIR, "lobs.yml.j2")
INPUT_FILE_HOSTS = os.path.join(TEMPLATES_DIR, "hosts.yml.j2")
INPUT_FILE_USERS = os.path.join(TEMPLATES_DIR, "users.yml.j2")

POLICY_DIR = os.path.join(os.sep, "data", "policy", "secrets")
OUTPUT_FILE_USER_POLICIES = os.path.join(POLICY_DIR, "users.yml")
OUTPUT_FILE_HOST_POLICIES = os.path.join(POLICY_DIR, "hosts.yml")
OUTPUT_FILE_SAFE_MANIFEST = os.path.join(POLICY_DIR, "safes.json")


def create_lob_policy_file(context, lob_number, safe_number):
    """
    This writes a legal Conjur Policy YAML/MAML file that can be loaded
    immediately into Conjur. This contains a specific LOB and Safe.
    Safe contains a given number of secrets and both consumer and viewer groups.
    """
    context['uuid'] = UUID
    context['lob_iteration'] = 'lob-' + str(lob_number)
    context['safe_iteration'] = 'safe-' + str(safe_number)

    with open(INPUT_FILE_LOBS) as t:
        template = Template(t.read())
    output_file = f"{POLICY_DIR}/lob-{lob_number}_safe-{safe_number}.yml"
    with open(output_file, 'w') as t:
        print("Writing LOBs Policy to: ", output_file)
        t.write(template.render(**context))


def create_hosts_policy_file(context):
    """
    This writes a legal Conjur Policy YAML/MAML file that can be loaded
    immediately into Conjur. This contains a given number of Hosts and Grants
    that correspond to each safe for the generated LOB policy.
    """
    with open(INPUT_FILE_HOSTS) as t:
        template = Template(t.read())
    with open(OUTPUT_FILE_HOST_POLICIES, 'w') as t:
        print("Writing Hosts Policy to: ", OUTPUT_FILE_HOST_POLICIES)
        t.write(template.render(**context))


def create_users_policy_file(context):
    """
    This writes a legal Conjur Policy YAML/MAML file that can be loaded
    immediately into Conjur. Like the generated Hosts policy, this contains a
    given number of Users and Grants that correspond to each safe for the
    generated LOB policy.
    """
    with open(INPUT_FILE_USERS) as t:
        template = Template(t.read())
    with open(OUTPUT_FILE_USER_POLICIES, 'w') as t:
        print("Writing Users Policy to: ", OUTPUT_FILE_USER_POLICIES)
        t.write(template.render(**context))


def create_safes_file(json_string):
    """
    This writes a JSON file containing a list of strings, each pertaining to
    the full path of every Safe for every LOB.

    The purpose of this to give developers a manifest that can be loaded into k6
    as a SharedArray. This can be used when testing secret read/writes against a
    Leader/Follower that has all of these secrets.
    """
    with open(OUTPUT_FILE_SAFE_MANIFEST, 'w') as t:
        print("Writing Safes Manifest to: ", OUTPUT_FILE_SAFE_MANIFEST)
        t.write(json_string)


def get_unique_safes(policy_id):
    """
    Returns a list of the unique safe identifiers across all LOBs.
    """
    safes = []
    for i in range(LOB_COUNT):
        for j in range(SAFE_COUNT):
            safes.append("{id}/lob-{i}/safe-{j}".format(
                id=policy_id,
                i=i + 1,
                j=j + 1,
            ))
    return safes


def generate_policy():
    users_per_safe = USER_COUNT // (LOB_COUNT * SAFE_COUNT)
    hosts_per_safe = HOST_COUNT // (LOB_COUNT * SAFE_COUNT)
    uuid_prefix = ""
    if UUID != "":
        uuid_prefix = f"-{UUID}"
    context = {
        'lobs': [f'lob-{x + 1}' for x in range(LOB_COUNT)],
        'safes': [f'safe-{x + 1}' for x in range(SAFE_COUNT)],
        'accounts': [f'account-{x + 1}{uuid_prefix}' for x in range(ACCOUNT_COUNT)],
        'secrets': [f'variable-{x + 1}{uuid_prefix}' for x in range(SECRETS_PER_ACCOUNT)],
        'users': [f'user-{x + 1}{uuid_prefix}' for x in range(users_per_safe)],
        'hosts': [f'host-{x + 1}{uuid_prefix}' for x in range(hosts_per_safe)],
        'leftover_users': [f'user-{x + users_per_safe + 1}{uuid_prefix}' for x in
                           range(USER_COUNT - (LOB_COUNT * SAFE_COUNT * users_per_safe))],
        'leftover_hosts': [f'host-{x + hosts_per_safe + 1}{uuid_prefix}' for x in
                           range(HOST_COUNT - (LOB_COUNT * SAFE_COUNT * hosts_per_safe))]
    }

    create_policy_files(context)


def create_policy_files(context):
    if os.path.exists(POLICY_DIR):
        shutil.rmtree(POLICY_DIR)

    os.makedirs(POLICY_DIR)

    for i in range(1, LOB_COUNT + 1):
        for j in range(1, SAFE_COUNT + 1):
            create_lob_policy_file(context, i, j)
    create_users_policy_file(context)
    create_hosts_policy_file(context)


def main():
    parser = argparse.ArgumentParser(description='Generate Conjur Policy')
    parser.add_argument('--uuid', required=False, help='UUID for the policy')
    parser.add_argument('--account_count', type=int, required=True, help='Number of accounts per safe')
    parser.add_argument('--secrets_per_account', type=int, required=True, help='Number of secrets per account')
    parser.add_argument('--lob_count', type=int, required=True, help='Number of lobs')
    parser.add_argument('--safe_count', type=int, required=True, help='Number of safes')
    parser.add_argument('--host_count', type=int, required=True, help='Number of hosts')
    parser.add_argument('--user_count', type=int, required=True, help='Number of users')
    args = parser.parse_args()

    global UUID, LOB_COUNT, ACCOUNT_COUNT, SECRETS_PER_ACCOUNT, SAFE_COUNT, HOST_COUNT, USER_COUNT, TOTAL_SECRETS

    UUID = args.uuid
    LOB_COUNT = args.lob_count
    ACCOUNT_COUNT = args.account_count
    SECRETS_PER_ACCOUNT = args.secrets_per_account
    SAFE_COUNT = args.safe_count
    HOST_COUNT = args.host_count
    USER_COUNT = args.user_count
    TOTAL_SECRETS = ACCOUNT_COUNT * SECRETS_PER_ACCOUNT * SAFE_COUNT * LOB_COUNT

    if UUID != "":
        print("UUID: ", UUID)

    print("Total LOBs: ", LOB_COUNT)
    print("Total Safes per LOB: ", SAFE_COUNT)
    print("Total Accounts per Safe: ", ACCOUNT_COUNT)
    print("Total Secrets per Account: ", SECRETS_PER_ACCOUNT)
    print("Total Secrets: ", TOTAL_SECRETS)
    print("Total Hosts: ", HOST_COUNT)
    print("Total Users: ", USER_COUNT)

    generate_policy()

    safe_variables = get_unique_safes(policy_id=VAULT_SYNCHRONIZER_POLICY_ID)
    create_safes_file(json.dumps(
        safe_variables,
        indent=4
    ))


if __name__ == '__main__':
    main()
