
variable "puppet_agent_linux_base_ami_id" {
  type = "string",
  default = "ami-0de53d8956e8dcf80"
}

variable "puppet_agent_win_2008R2_base_ami_id" {
  type = "string",
  default = "ami-0ed62a915794ca035"
}

variable "puppet_agent_win_2019_base_ami_id" {
  type = "string",
  default = "ami-0204606704df03e7e"
}

variable "puppet_agent_win_core_base_ami_id" {
  type = "string",
  default = "ami-0b0155d73993a98fb"
}

# Security Group for Puppet Agents
resource "aws_security_group" "puppet_agent_node" {
  name        = "${var.resource_prefix}puppet-agent-node"
  description = "Allow Puppet Agent Node Traffic"
  vpc_id      = "${var.vpc_id}"

    ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "6"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "6"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Remote Desktop
  ingress {
    from_port   = 3389
    to_port     = 3389
    protocol    = "6"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Powershell remote management
  ingress {
    from_port   = 5985
    to_port     = 5985
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

resource "aws_instance" "puppet_agent_linux_node" {
  ami                     = "${var.puppet_agent_linux_base_ami_id}"
  instance_type           =  "t2.medium"
  availability_zone       = "${var.availability_zone}"
  subnet_id               = "${data.aws_subnet.subnet.id}"
  key_name                = "${var.key_name}"
  vpc_security_group_ids  = ["${aws_security_group.puppet_agent_node.id}"]

  tags = {
    Name                  = "${var.resource_prefix}puppet-agent-linux"
  }
}

resource "aws_instance" "puppet_agent_win_2008R2_node" {
  ami                     = "${var.puppet_agent_win_2008R2_base_ami_id}"
  instance_type           =  "t2.medium"
  availability_zone       = "${var.availability_zone}"
  subnet_id               = "${data.aws_subnet.subnet.id}"
  key_name                = "${var.key_name}"
  vpc_security_group_ids  = ["${aws_security_group.puppet_agent_node.id}"]

  tags = {
    Name                  = "${var.resource_prefix}puppet-agent-win-2008R2"
  }
}

resource "aws_instance" "puppet_agent_win_core_node" {
  ami                     = "${var.puppet_agent_win_core_base_ami_id}"
  instance_type           =  "t2.medium"
  availability_zone       = "${var.availability_zone}"
  subnet_id               = "${data.aws_subnet.subnet.id}"
  key_name                = "${var.key_name}"
  vpc_security_group_ids  = ["${aws_security_group.puppet_agent_node.id}"]

  tags = {
    Name                  = "${var.resource_prefix}puppet-agent-win-core"
  }
}

#############################################
# Outputs
#############################################

output "puppet_agent_linux_public_dns" {
  value = "${aws_instance.puppet_agent_linux_node.public_dns}"
}

output "puppet_agent_linux_public_ip" {
  value = "${aws_instance.puppet_agent_linux_node.public_ip}"
}

output "puppet_agent_linux_private_dns" {
  value = "${aws_instance.puppet_agent_linux_node.private_dns}"
}

output "puppet_agent_linux_private_ip" {
  value = "${aws_instance.puppet_agent_linux_node.private_ip}"
}

output "puppet_agent_win_2008R2_public_dns" {
  value = "${aws_instance.puppet_agent_win_2008R2_node.public_dns}"
}

output "puppet_agent_win_2008R2_public_ip" {
  value = "${aws_instance.puppet_agent_win_2008R2_node.public_ip}"
}

output "puppet_agent_win_2008R2_private_dns" {
  value = "${aws_instance.puppet_agent_win_2008R2_node.private_dns}"
}

output "puppet_agent_win_2008R2_private_ip" {
  value = "${aws_instance.puppet_agent_win_2008R2_node.private_ip}"
}

output "puppet_agent_win_2008R2_aws_id" {
  value = "${aws_instance.puppet_agent_win_2008R2_node.id}"
}


output "puppet_agent_win_core_public_dns" {
  value = "${aws_instance.puppet_agent_win_core_node.public_dns}"
}

output "puppet_agent_win_core_public_ip" {
  value = "${aws_instance.puppet_agent_win_core_node.public_ip}"
}

output "puppet_agent_win_core_private_dns" {
  value = "${aws_instance.puppet_agent_win_core_node.private_dns}"
}

output "puppet_agent_win_core_private_ip" {
  value = "${aws_instance.puppet_agent_win_core_node.private_ip}"
}

output "puppet_agent_win_core_aws_id" {
  value = "${aws_instance.puppet_agent_win_core_node.id}"
}

