#!/bin/bash -eu

: ${SSH_KEY_FILE?"Need to set SSH_KEY_FILE"}

CONJUR_MASTER_PUBLIC_DNS=$(terraform output conjur_master_public)

mkdir -p ./conjur
openssl rand -base64 16 > ./conjur/admin_password

ssh -i "${SSH_KEY_FILE}" \
  -o "StrictHostKeyChecking no" \
  core@${CONJUR_MASTER_PUBLIC_DNS} /bin/bash << SSH
  docker exec conjur-appliance evoke configure master \
    -h ${CONJUR_MASTER_PUBLIC_DNS} \
    -p $(<./conjur/admin_password) \
    puppet
SSH 

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
