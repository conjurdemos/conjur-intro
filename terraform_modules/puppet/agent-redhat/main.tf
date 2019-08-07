data "template_file" "redhat_install_puppet" {
  count = length(var.node_names)

  template = file("${path.module}/templates/install_puppet.sh.tpl")
  vars = {
    puppet_master_private_ip = var.puppet_master_ip
    node_name                = element(var.node_names, count.index)
    run_interval             = var.run_interval
  }
}

resource "aws_instance" "puppet_agent_redhat_nodes" {
  count = length(var.node_names)

  ami                    = element(var.ami_ids, count.index)
  instance_type          = "t2.medium"
  availability_zone      = var.availability_zone
  subnet_id              = data.aws_subnet.subnet.id
  key_name               = var.ssh_key_name
  vpc_security_group_ids = [var.security_group_id]

  tags = {
    Name = "${var.resource_prefix}${element(var.node_names, count.index)}"
  }

  connection {
    type        = "ssh"
    host        = "${self.public_ip}"
    user        = "ec2-user"
    private_key = var.ssh_key_pem
  }

  provisioner "file" {
    content = element(
      data.template_file.redhat_install_puppet.*.rendered,
      count.index,
    )
    destination = "~/install_puppet.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x ~/install_puppet.sh",
      "sudo ~/install_puppet.sh",
    ]
  }
}

