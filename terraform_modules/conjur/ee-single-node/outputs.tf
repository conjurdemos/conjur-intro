#############################################
# Outputs
#############################################

output "conjur_master_public" {
  value = "${aws_instance.conjur_master.public_dns}"
}

output "conjur_master_private" {
  value = "${aws_instance.conjur_master.private_dns}"
}
