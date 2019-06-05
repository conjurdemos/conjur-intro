variable "node_names" {
  type = "list"
}

variable "ami_ids" {
  type = "list"
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

variable "ssh_key_name" {
  type = "string"
}

variable "ssh_key_pem" {
  type = "string"
}

variable "security_group_id" {
  type = "string"
}

variable "puppet_master_ip" {
  type = "string"
}

variable "run_interval" {
  type = "string"
  default = "30"
}

#############################################
# State Information from AWS
#############################################

data "aws_subnet" "subnet" {
  vpc_id            = "${var.vpc_id}"
  availability_zone = "${var.availability_zone}"
}
