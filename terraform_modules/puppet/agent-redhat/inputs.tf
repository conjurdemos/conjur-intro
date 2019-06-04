variable "node_names" {
  default = [
    "puppet-agent-redhat"
  ]
}

variable "ami_ids" {
  default = [
    "ami-0de53d8956e8dcf80"
  ]
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

#############################################
# State Information from AWS
#############################################

data "aws_subnet" "subnet" {
  vpc_id            = "${var.vpc_id}"
  availability_zone = "${var.availability_zone}"
}
