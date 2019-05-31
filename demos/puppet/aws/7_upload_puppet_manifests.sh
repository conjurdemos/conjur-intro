#!/bin/bash -eu

: ${SSH_KEY_FILE?"Need to set SSH_KEY_FILE"}

PUPPET_MASTER_HOST=$(terraform output puppet_master_public_dns)

# Stage the files on the server (we can't write directly to the puppet directory)
scp -i "${SSH_KEY_FILE}" \
    -o "StrictHostKeyChecking no" \
    -r \
    ./puppet/manifests \
    "ec2-user@${PUPPET_MASTER_HOST}:~"

scp -i "${SSH_KEY_FILE}" \
    -o "StrictHostKeyChecking no" \
    -r \
    ./puppet/modules \
    "ec2-user@${PUPPET_MASTER_HOST}:~"

# Login and copy the files to the puppet directories
ssh -i "${SSH_KEY_FILE}" \
    -o "StrictHostKeyChecking no" \
    "ec2-user@${PUPPET_MASTER_HOST}" /bin/bash << EOF
  sudo cp -Rv /home/ec2-user/manifests /etc/puppetlabs/code/environments/production
  sudo cp -Rv /home/ec2-user/modules /etc/puppetlabs/code/environments/production
EOF
