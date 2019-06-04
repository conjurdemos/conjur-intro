# Security Group for Puppet Master
resource "aws_security_group" "puppet_master" {
  name        = "${var.resource_prefix}puppet-master"
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

resource "aws_instance" "puppet_master" {
  ami                     = "${var.ami_id}"
  instance_type           =  "t2.medium"
  availability_zone       = "${var.availability_zone}"
  subnet_id               = "${data.aws_subnet.subnet.id}"
  key_name                = "${var.ssh_key_name}"
  vpc_security_group_ids  = ["${aws_security_group.puppet_master.id}"]

  tags = {
    Name                  = "${var.resource_prefix}puppet-master"
  }

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = "${var.ssh_key_pem}"
  }

  provisioner "file" {
    content     = "${file("${path.module}/templates/install_master.sh.tpl")}"
    destination = "~/install_puppet.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x ~/install_puppet.sh",
      "sudo ~/install_puppet.sh"      
    ]
  }
}
