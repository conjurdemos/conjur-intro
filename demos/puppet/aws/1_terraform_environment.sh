#!/bin/bash -eu

terraform init terraform
terraform apply --auto-approve terraform
