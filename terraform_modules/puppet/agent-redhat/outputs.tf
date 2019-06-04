output "public_dns" {
  value = "${aws_instance.puppet_agent_redhat_nodes.*.public_dns}"
}
