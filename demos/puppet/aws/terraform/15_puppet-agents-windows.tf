
variable "puppet_agent_win_nodes" {
  default = [
    "agent-win-2008r2.puppet"
    ,"agent-win-2019.puppet"
    ,"agent-win-core.puppet"
  ]
}

variable "puppet_agent_win_amis" {
  default = [
     "ami-0ed62a915794ca035" # Windows 2008R2
    ,"ami-0204606704df03e7e" # Windows 2019
    ,"ami-0b0155d73993a98fb" # Windows 2019 Core
  ]
}

data "template_file" "windows_install_puppet" {
  count    = "${length(var.puppet_agent_win_nodes)}"

  template = "${file("${path.module}/files/windows/install_puppet.tpl")}"
  vars = {
    puppet_master_private_ip = "${aws_instance.puppet_master_node.private_ip}"
    node_name = "${element(var.puppet_agent_win_nodes, count.index)}"
  }
}

data "local_file" "windows_userdata" {
    filename = "${path.module}/files/windows/user_data.txt"
}

resource "aws_instance" "puppet_agent_win_nodes" {
  count    = "${length(var.puppet_agent_win_nodes)}"

  ami                     = "${element(var.puppet_agent_win_amis, count.index)}"
  instance_type           =  "t2.medium"
  availability_zone       = "${var.availability_zone}"
  subnet_id               = "${data.aws_subnet.subnet.id}"
  key_name                = "${aws_key_pair.generated_key.key_name}"
  vpc_security_group_ids  = ["${aws_security_group.puppet_agent_node.id}"]

  get_password_data       = true
  user_data               = "${data.local_file.windows_userdata.content}"

  tags = {
    Name                  = "${var.resource_prefix}${element(var.puppet_agent_win_nodes, count.index)}"
  }

  connection {
    type      = "winrm"
    port      = 5985
    password  = "${rsadecrypt(self.password_data, tls_private_key.ssh_access_key.private_key_pem)}"
    https     = false
    insecure  = true
  }

  provisioner "file" {
    content     = "${element(data.template_file.windows_install_puppet.*.rendered, count.index)}"
    destination = "C:\\temp\\install_puppet.ps1"
  }

  provisioner "remote-exec" {
    inline = [
      "powershell -ExecutionPolicy Unrestricted -File C:\\temp\\install_puppet.ps1"
    ]
  }
}

output "puppet_agent_win_public_dns" {
  value = "${aws_instance.puppet_agent_win_nodes.*.public_dns}"
}
