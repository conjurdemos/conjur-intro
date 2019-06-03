resource "tls_private_key" "ssh_access_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "generated_key" {
  key_name   = "${var.resource_prefix}ssh_key"
  public_key = "${tls_private_key.ssh_access_key.public_key_openssh}"
}

output "ssh_key" {
  sensitive = true
  value = "${tls_private_key.ssh_access_key.private_key_pem}"
}
