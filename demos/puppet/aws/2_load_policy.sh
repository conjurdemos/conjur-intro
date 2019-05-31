#!/bin/bash -eu

CONJUR_MASTER_PUBLIC_DNS=$(terraform output conjur_master_public)

# Load PCF policy
docker run --rm -v "$(pwd):/data" --entrypoint /bin/bash cyberark/conjur-cli:5 -c "
  yes yes | conjur init -u https://${CONJUR_MASTER_PUBLIC_DNS} -a puppet --force=true
  conjur authn login -u admin -p \"\$(cat /data/conjur/admin_password)\"

  # Load the environment policy
  pushd /data/policy
    conjur policy load root puppet.yml
    conjur policy load puppet puppet/body.yml
    conjur policy load root secret.yml
  popd

  # Grab admin user's api key
  conjur user rotate_api_key > /data/conjur/admin_key

  # Create host factory token for puppet
  conjur hostfactory tokens create --duration-days 365 puppet > /data/conjur/host_factory_token

  # Give the secret an initial value
  conjur variable values add my-secret 'initial secret value'

  # Extract Cert Chain
  cp /root/conjur-puppet.pem /data/conjur/conjur.pem
"

# Store config where puppet can use it
echo "https://$(terraform output conjur_master_public)" > ./puppet/modules/conjur_config/files/appliance_url
cp ./conjur/conjur.pem ./puppet/modules/conjur_config/files/
cat ./conjur/host_factory_token | jq -r '.[0].token' > ./puppet/modules/conjur_config/files/host_factory_token
