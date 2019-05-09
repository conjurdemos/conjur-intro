# Configure the AWS Provider
provider "aws" {
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

variable "key_name" {
  type = "string"
}

variable "availability_zone" {
  default = "us-east-1a"
}

#############################################
# State Information from AWS
#############################################

data "aws_subnet" "subnet" {
  vpc_id            = "${var.vpc_id}"
  availability_zone = "${var.availability_zone}"
}
