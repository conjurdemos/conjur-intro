import argparse
from jinja2 import Template
import os, shutil
import re

TEMPLATES_DIR = os.path.join(os.sep, "authenticator-generator", "templates")
AUTHENTICATORS_DIR = os.path.join(os.sep, "data", "authenticators")
POLICY_DIR = os.path.join(os.sep, "data", "policy", "authenticators")

def generate_authenticator_policies(number, offset, authenticators_per_policy):
    if os.path.exists(POLICY_DIR):
        shutil.rmtree(POLICY_DIR)

    os.makedirs(POLICY_DIR)

    input_file = os.path.join(TEMPLATES_DIR, "oidc-policy.yml.j2")

    context = {}
    context['offset'] = offset
    context['authenticators_per_policy'] = authenticators_per_policy

    with open(input_file) as t:
        template = Template(t.read())

    iterations=int(number/authenticators_per_policy)
    for i in range(1, iterations+1):
      output_file = os.path.join(POLICY_DIR, f"oidc-policy-{i}.yml")

      with open(output_file, 'w') as t:
          print("Writing OIDC Policy to: ", output_file)
          t.write(template.render(**context))

      context['offset'] += authenticators_per_policy

def main():
    parser = argparse.ArgumentParser(description='Generate Conjur Keycloak Authenticator Policies')
    parser.add_argument('--number', type=int, required=True, help='Number of authenticators policy to generate')
    parser.add_argument('--offset', type=int, required=False, help='Offset in the authenticator policy numbering')
    parser.add_argument('--authenticators-per-policy', type=int, required=True, help='Number of authenticators per generated policy file')
    args = parser.parse_args()

    number = args.number
    offset = args.offset
    authenticators_per_policy = args.authenticators_per_policy

    print("Number of authenticator policies: ", number)
    print("Offset: ", offset)
    print("Authenticators per policy: ", authenticators_per_policy)

    generate_authenticator_policies(number, offset, authenticators_per_policy)


if __name__ == '__main__':
    main()
