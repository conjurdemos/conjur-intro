#############################################
# Inputs
#############################################

variable "vpc_id" {
  type = string
}

variable "ami_id" {
  type = string
}

variable "key_name" {
  type = string
}

variable "availability_zones" {
  default = ["us-east-1a", "us-east-1b"]
}

variable "resource_prefix" {
  type = string
  default = ""
}

#############################################
# Configure the AWS Provider
#############################################

provider "aws" {}

#############################################
# State Information from AWS
#############################################

data "aws_subnet" "subnet" {
  count             = length(var.availability_zones)

  vpc_id            = var.vpc_id
  availability_zone = element(var.availability_zones, count.index)
}


#############################################
# Load Balancer Config
#############################################

resource "aws_security_group" "lb" {
  name        = "${var.resource_prefix}conjur-ha-lb"
  description = "Allow Conjur Master Traffic"
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

  egress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    cidr_blocks     = ["0.0.0.0/0"]
  }
}

# Load balancer for master cluster
resource "aws_elb" "lb" {
  name = "${var.resource_prefix}conjur-ha-lb"

  subnets             = data.aws_subnet.subnet.*.id
  security_groups     = [aws_security_group.lb.id]

  # API and UI
  listener {
    instance_port     = 443
    instance_protocol = "tcp"
    lb_port           = 443
    lb_protocol       = "tcp"
  }

  # Postgres Replication
  listener {
    instance_port     = 5432
    instance_protocol = "tcp"
    lb_port           = 5432
    lb_protocol       = "tcp"
  }

  # Syslog Forwarding
  listener {
    instance_port     = 1999
    instance_protocol = "tcp"
    lb_port           = 1999
    lb_protocol       = "tcp"
  }

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 3
    target              = "HTTPS:443/health"
    interval            = 30
  }

  tags = {
    Name = "${var.resource_prefix}conjur-ha-lb"
  }
}

# Load balancer for followers
resource "aws_elb" "follower_lb" {
  name = "${var.resource_prefix}conjur-ha-follower-lb"

  subnets             = data.aws_subnet.subnet.*.id
  security_groups     = [aws_security_group.lb.id]

  # API and UI
  listener {
    instance_port     = 443
    instance_protocol = "tcp"
    lb_port           = 443
    lb_protocol       = "tcp"
  }

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 3
    target              = "HTTPS:443/health"
    interval            = 30
  }

  tags = {
    Name = "${var.resource_prefix}conjur-ha-follower-lb"
  }
}

#############################################
# 3-Node Master Cluster Config
#############################################

# Security Group for Node Instances
resource "aws_security_group" "master_node" {
  name        = "${var.resource_prefix}conjur-ha-master-node"
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
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    cidr_blocks     = ["0.0.0.0/0"]
  }
}

# Instances
resource "aws_instance" "conjur_master_node" {
  count                   = 3

  ami                     = var.ami_id
  instance_type           =  "m4.large"
  availability_zone       = element(var.availability_zones, count.index)
  subnet_id               = element(data.aws_subnet.subnet.*.id, count.index)
  key_name                = var.key_name
  vpc_security_group_ids  = [aws_security_group.master_node.id]

  tags = {
    Name                  = "${var.resource_prefix}conjur-master-${count.index + 1}"
  }
}

resource "aws_elb_attachment" "lb_nodes" {
  count    = length(aws_instance.conjur_master_node)
  elb      = aws_elb.lb.id
  instance = element(aws_instance.conjur_master_node.*.id, count.index)
}

#############################################
# Follower config
#############################################

# Security Group for Node Instances
resource "aws_security_group" "follower_node" {
  name        = "${var.resource_prefix}conjur-ha-follower-node"
  description = "Allow Conjur Follower Node Traffic"
  vpc_id      = var.vpc_id

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

# Instances
resource "aws_instance" "conjur_follower_node" {
  count                   = 2

  ami                     = var.ami_id
  instance_type           =  "m4.large"
  availability_zone       = element(var.availability_zones, count.index)
  subnet_id               = element(data.aws_subnet.subnet.*.id, count.index)
  key_name                = var.key_name
  vpc_security_group_ids  = [aws_security_group.follower_node.id]

  tags = {
    Name                  = "${var.resource_prefix}conjur-follower-${count.index + 1}"
  }
}

resource "aws_elb_attachment" "follower_lb_nodes" {
  count    = length(aws_instance.conjur_follower_node)
  elb      = aws_elb.follower_lb.id
  instance = element(aws_instance.conjur_follower_node.*.id, count.index)
}

#############################################
# Outputs
#############################################

output "conjur_master_lb_public" {
  value = aws_elb.lb.dns_name
}

output "conjur_follower_lb_public" {
  value = aws_elb.follower_lb.dns_name
}

output "conjur_master_nodes_public" {
  value = aws_instance.conjur_master_node.*.public_dns
}

output "conjur_master_nodes_private" {
  value = aws_instance.conjur_master_node.*.private_dns
}

output "conjur_follower_nodes_public" {
  value = aws_instance.conjur_follower_node.*.public_dns
}