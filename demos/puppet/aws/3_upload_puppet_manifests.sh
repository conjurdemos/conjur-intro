#!/bin/bash -eu

PUPPET_MASTER_HOST=$(terraform output puppet_master_public_dns)

# Stage the files on the server (we can't write directly to the puppet directory)
scp -i ~/.ssh/micahlee.pem \
    -o "StrictHostKeyChecking no" \
    -r \
    ./puppet/manifests \
    "ec2-user@${PUPPET_MASTER_HOST}:~"

# Login and copy the files to the puppet directories
ssh -i ~/.ssh/micahlee.pem \
    -o "StrictHostKeyChecking no" \
    "ec2-user@${PUPPET_MASTER_HOST}" /bin/bash << EOF
  sudo cp -R /home/ec2-user/manifests /etc/puppetlabs/code/environments/production
EOF
