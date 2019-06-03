
variable "puppet_agent_linux_base_ami_id" {
  type = "string",
  default = "ami-0de53d8956e8dcf80"
}

data "template_file" "redhat_install_puppet" {
  template = "${file("${path.module}/files/redhat/install_puppet.sh.tpl")}"
  vars = {
    puppet_master_private_ip = "${aws_instance.puppet_master_node.private_ip}"
    node_name = "agent-linux.puppet"
  }
}


resource "aws_instance" "puppet_agent_linux_node" {
  ami                     = "${var.puppet_agent_linux_base_ami_id}"
  instance_type           =  "t2.medium"
  availability_zone       = "${var.availability_zone}"
  subnet_id               = "${data.aws_subnet.subnet.id}"
  key_name                = "${aws_key_pair.generated_key.key_name}"
  vpc_security_group_ids  = ["${aws_security_group.puppet_agent_node.id}"]

  tags = {
    Name                  = "${var.resource_prefix}puppet-agent-linux"
  }

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = "${tls_private_key.ssh_access_key.private_key_pem}"
  }

  provisioner "file" {
    content     = "${data.template_file.redhat_install_puppet.rendered}"
    destination = "~/install_puppet.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x ~/install_puppet.sh",
      "sudo ~/install_puppet.sh"      
    ]
  }
}

#############################################
# Outputs
#############################################

output "puppet_agent_linux_public_dns" {
  value = "${aws_instance.puppet_agent_linux_node.public_dns}"
}
