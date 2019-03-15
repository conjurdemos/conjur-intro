provider "aws" {
  # Use credentials from environment
}

#############################################
# Inputs
#############################################

variable "resource_prefix" {
  type = "string"
  default = ""
}

variable "vpc_id" {
  type = "string"
}

variable "az" {
  default = "us-east-1a"
}

variable "ami_id" {
  default = "ami-0a313d6098716f372"
}

variable "instance_type" {
  default = "t2.micro"
}

#############################################
# AWS Management Key Pair
#############################################

resource "tls_private_key" "management_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "generated_key" {
  key_name   = "${var.resource_prefix}management-key"
  public_key = "${tls_private_key.management_key.public_key_openssh}"
}

#############################################
# State Information from AWS
#############################################

data "aws_subnet" "subnet" {
  vpc_id            = "${var.vpc_id}"
  availability_zone = "${var.az}"
}

#############################################
# Web Server
#############################################

resource "aws_security_group" "web" {
  name        = "${var.resource_prefix}web"
  description = "Allow HTTPS and SSH traffic"
  vpc_id      = "${var.vpc_id}"

  ingress {
    from_port   = 443
    to_port     = 443
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

resource "aws_instance" "web" {
  ami           = "${var.ami_id}"
  instance_type = "${var.instance_type}"

  availability_zone       = "${var.az}"
  subnet_id               = "${data.aws_subnet.subnet.id}"
  key_name                = "${aws_key_pair.generated_key.key_name}"
  vpc_security_group_ids  = ["${aws_security_group.web.id}"]

  tags = {
    Name                  = "${var.resource_prefix}web"
  }
}

resource "aws_security_group" "db" {
  name        = "${var.resource_prefix}db"
  description = "Allow HTTPS and SSH traffic"
  vpc_id      = "${var.vpc_id}"

  ingress {
    from_port   = 5432
    to_port     = 5432
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


resource "aws_instance" "db" {
  ami           = "${var.ami_id}"
  instance_type = "${var.instance_type}"

  availability_zone       = "${var.az}"
  subnet_id               = "${data.aws_subnet.subnet.id}"
  key_name                = "${aws_key_pair.generated_key.key_name}"
  vpc_security_group_ids  = ["${aws_security_group.db.id}"]

  tags = {
    Name                  = "${var.resource_prefix}db"
  }
}

#############################################
# Outputs
#############################################

output "web_dns" {
  value = "${aws_instance.web.public_dns}"
}

output "db_dns" {
  value = "${aws_instance.db.public_dns}"
}

output "ssh_key" {
  sensitive = true
  value = "${tls_private_key.management_key.private_key_pem}"
}