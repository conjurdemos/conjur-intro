#############################################
# Outputs
#############################################

output "public_dns" {
  value = "${aws_instance.puppet_master.public_dns}"
}

output "public_ip" {
  value = "${aws_instance.puppet_master.public_ip}"
}

output "private_dns" {
  value = "${aws_instance.puppet_master.private_dns}"
}

output "private_ip" {
  value = "${aws_instance.puppet_master.private_ip}"
}
