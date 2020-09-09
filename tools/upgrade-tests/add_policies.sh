#!/bin/bash -e

../../bin/cli conjur policy load --replace root policy/users.yml
../../bin/cli conjur policy load root policy/policy.yml
../../bin/cli conjur policy load staging policy/apps/myapp.yml
../../bin/cli conjur policy load production policy/apps/myapp.yml
../../bin/cli conjur policy load root policy/application_grants.yml
../../bin/cli conjur policy load root policy/hosts.yml