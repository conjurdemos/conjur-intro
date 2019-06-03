
variable "conjur_ami_id" {
  type = "string"
}

#############################################
# Conjur Master Config
#############################################

# Security Group for Node Instances
resource "aws_security_group" "conjur_master_node" {
  name        = "${var.resource_prefix}conjur-master-node"
  description = "Allow Conjur Master Node Traffic"
  vpc_id      = "${var.vpc_id}"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "6"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "6"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 1999
    to_port     = 1999
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

data "template_file" "install_conjur_master" {
  template = "${file("${path.module}/files/conjur/install_master.tpl")}"
  vars = {
    admin_password = "${file("${path.module}/files/conjur/admin_password")}"
  }
}

# Instances
resource "aws_instance" "conjur_master_node" {
  ami                     = "${var.conjur_ami_id}"
  instance_type           =  "t2.large"
  availability_zone       = "${var.availability_zone}"
  subnet_id               = "${data.aws_subnet.subnet.id}"
  key_name                = "${aws_key_pair.generated_key.key_name}"
  vpc_security_group_ids  = ["${aws_security_group.conjur_master_node.id}"]

  tags = {
    Name                  = "${var.resource_prefix}conjur-master"
  }

  connection {
    type        = "ssh"
    user        = "core"
    private_key = "${tls_private_key.ssh_access_key.private_key_pem}"
  }

  provisioner "file" {
    content     = "${data.template_file.install_conjur_master.rendered}"
    destination = "~/install_conjur.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x ~/install_conjur.sh",
      "sudo ~/install_conjur.sh"      
    ]
  }
}

#############################################
# Outputs
#############################################

output "conjur_master_public" {
  value = "${aws_instance.conjur_master_node.public_dns}"
}

output "conjur_master_private" {
  value = "${aws_instance.conjur_master_node.private_dns}"
}
