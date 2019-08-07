#############################################
# Conjur Master Config
#############################################

# Security Group for Node Instances
resource "aws_security_group" "conjur_master" {
  name        = "${var.resource_prefix}conjur-master"
  description = "Allow Conjur Master Node Traffic"
  vpc_id      = var.vpc_id

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
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "template_file" "install_conjur_master_script" {
  template = file("${path.module}/templates/install_master.sh.tpl")
  vars = {
    admin_password = var.admin_password != "" ? var.admin_password : random_string.admin_password.result
  }
}

# Instances
resource "aws_instance" "conjur_master" {
  ami                    = data.aws_ami.conjur_ee_ami.id
  instance_type          = "t2.large"
  availability_zone      = var.availability_zone
  subnet_id              = data.aws_subnet.subnet.id
  key_name               = var.ssh_key_name
  vpc_security_group_ids = [aws_security_group.conjur_master.id]

  tags = {
    Name = "${var.resource_prefix}conjur-master"
  }

  connection {
    type        = "ssh"
    host        = "${self.public_ip}"
    user        = "core"
    private_key = var.ssh_key_pem
  }

  provisioner "file" {
    content     = data.template_file.install_conjur_master_script.rendered
    destination = "~/install_conjur.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x ~/install_conjur.sh",
      "sudo ~/install_conjur.sh",
    ]
  }
}

