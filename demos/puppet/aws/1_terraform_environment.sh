#!/bin/bash -eu

terraform init terraform
terraform apply --auto-approve terraform

terraform output ssh_key > id_rsa
chmod 400 id_rsa
