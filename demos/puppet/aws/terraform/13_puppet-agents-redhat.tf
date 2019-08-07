
variable "puppet_agent_redhat_nodes" {
  default = [
    "agent-redhat.puppet"
  ]
}

variable "puppet_agent_redhat_amis" {
  default = [
     "ami-0de53d8956e8dcf80"
  ]
}

module "puppet_agents_redhat" {
  source = "../../../../terraform_modules/puppet/agent-redhat"

  ami_ids = "${var.puppet_agent_redhat_amis}"
  node_names = "${var.puppet_agent_redhat_nodes}"
  puppet_master_ip = "${module.puppet_master.private_ip}"
  vpc_id = "${var.vpc_id}"
  security_group_id = "${aws_security_group.puppet_agent_node.id}"
  resource_prefix = "${var.resource_prefix}"
  ssh_key_name = "${aws_key_pair.generated_key.key_name}"
  ssh_key_pem = "${tls_private_key.ssh_access_key.private_key_pem}"
}

output "puppet_agent_redhat_public_dns" {
  value = "${module.puppet_agents_redhat.public_dns}"
}
