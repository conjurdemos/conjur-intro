output "public_dns" {
  value = aws_instance.puppet_agent_win_nodes.*.public_dns
}

output "password" {
  value = aws_instance.puppet_agent_win_nodes.*.password_data
}

