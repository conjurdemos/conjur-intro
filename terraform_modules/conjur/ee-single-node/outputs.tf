#############################################
# Outputs
#############################################

output "public_dns" {
  value = aws_instance.conjur_master.public_dns
}

output "private_dns" {
  value = aws_instance.conjur_master.private_dns
}

output "admin_password" {
  value     = var.admin_password != "" ? var.admin_password : random_string.admin_password.result
  sensitive = true
}

