variable "conjur_ee_ami_id" {
  type = "string"
}

variable "resource_prefix" {
  type = "string"
  default = ""
}

variable "vpc_id" {
  type = "string"
}

variable "availability_zone" {
  default = "us-east-1a"
}

variable "admin_password" {
  type = "string"
  default = "${random_string.admin_password}"
}

variable "ssh_key_name" {
  type = "string"
}

variable "ssh_key_pem" {
  type = "string"
}

#############################################
# Generated Data
#############################################

# Password for Conjur Admin user
resource "random_string" "admin_password" {
  length = 16
  special = true
}

#############################################
# State Information from AWS
#############################################

data "aws_subnet" "subnet" {
  vpc_id            = "${var.vpc_id}"
  availability_zone = "${var.availability_zone}"
}
