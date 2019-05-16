
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

resource "aws_instance" "pupper_master_node" {
  ami                     = "${var.puppet_master_base_ami_id}"
  instance_type           =  "t2.medium"
  availability_zone       = "${var.availability_zone}"
  subnet_id               = "${data.aws_subnet.subnet.id}"
  key_name                = "${var.key_name}"
  vpc_security_group_ids  = ["${aws_security_group.puppet_master_node.id}"]

  tags = {
    Name                  = "${var.resource_prefix}puppet-master"
  }
}

#############################################
# Outputs
#############################################

output "puppet_master_public_dns" {
  value = "${aws_instance.pupper_master_node.public_dns}"
}

output "puppet_master_public_ip" {
  value = "${aws_instance.pupper_master_node.public_ip}"
}

output "puppet_master_private_dns" {
  value = "${aws_instance.pupper_master_node.private_dns}"
}

output "puppet_master_private_ip" {
  value = "${aws_instance.pupper_master_node.private_ip}"
}
