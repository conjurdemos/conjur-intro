
variable "puppet_master_base_ami_id" {
  type = "string",
  default = "ami-0de53d8956e8dcf80"
}

# Security Group for Puppet Master
resource "aws_security_group" "puppet_master_node" {
  name        = "${var.resource_prefix}puppet-master-node"
  description = "Allow Puppet Master Node Traffic"
  vpc_id      = "${var.vpc_id}"

  ingress {
    from_port   = 8140
    to_port     = 8140
    protocol    = "6"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "6"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    cidr_blocks     = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "puppet_master_node" {
  ami                     = "${var.puppet_master_base_ami_id}"
  instance_type           =  "t2.medium"
  availability_zone       = "${var.availability_zone}"
  subnet_id               = "${data.aws_subnet.subnet.id}"
  key_name                = "${aws_key_pair.generated_key.key_name}"
  vpc_security_group_ids  = ["${aws_security_group.puppet_master_node.id}"]

  tags = {
    Name                  = "${var.resource_prefix}puppet-master"
  }

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = "${tls_private_key.ssh_access_key.private_key_pem}"
  }

  provisioner "file" {
    content     = "${file("${path.module}/files/puppet/install_master.tpl")}"
    destination = "~/install_puppet.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x ~/install_puppet.sh",
      "sudo ~/install_puppet.sh"      
    ]
  }
}

#############################################
# Outputs
#############################################

output "puppet_master_public_dns" {
  value = "${aws_instance.puppet_master_node.public_dns}"
}

output "puppet_master_public_ip" {
  value = "${aws_instance.puppet_master_node.public_ip}"
}

output "puppet_master_private_dns" {
  value = "${aws_instance.puppet_master_node.private_dns}"
}

output "puppet_master_private_ip" {
  value = "${aws_instance.puppet_master_node.private_ip}"
}
