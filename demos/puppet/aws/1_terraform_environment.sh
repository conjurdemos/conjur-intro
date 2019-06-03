#!/bin/bash -eu

terraform init terraform
terraform apply --auto-approve terraform

# Store SSH key for instance access
rm -rf id_rsa
terraform output ssh_key > id_rsa
chmod 400 id_rsa
