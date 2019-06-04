module "conjur_master" {
  source = "../../../../terraform_modules/conjur/ee-single-node"

  vpc_id = "${var.vpc_id}"
  resource_prefix = "${var.resource_prefix}"
  conjur_ee_ami_id = "${var.conjur_ee_ami_id}"
  ssh_key_name = "${aws_key_pair.generated_key.key_name}"
  ssh_key_pem = "${tls_private_key.ssh_access_key.private_key_pem}"
}

output "conjur_master_public" {
  value = "${module.conjur_master.public_dns}"
}

output "conjur_master_private" {
  value = "${module.conjur_master.private_dns}"
}

output "conjur_master_password" {
  value = "${module.conjur_master.admin_password}",
  sensitive = true
}