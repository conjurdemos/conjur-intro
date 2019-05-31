
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
    to_port     = 5986
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
