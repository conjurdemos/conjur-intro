data "template_file" "windows_install_puppet" {
  count    = "${length(var.node_names)}"

  template = "${file("${path.module}/templates/install_puppet.tpl")}"
  vars = {
    puppet_master_private_ip = "${var.puppet_master_ip}"
    node_name = "${element(var.node_names, count.index)}"
  }
}

data "local_file" "windows_userdata" {
    filename = "${path.module}/templates/user_data.txt"
}

resource "aws_instance" "puppet_agent_win_nodes" {
  count    = "${length(var.node_names)}"

  ami                     = "${element(var.ami_ids, count.index)}"
  instance_type           =  "t2.medium"
  availability_zone       = "${var.availability_zone}"
  subnet_id               = "${data.aws_subnet.subnet.id}"
  key_name                = "${var.ssh_key_name}"
  vpc_security_group_ids  = ["${var.security_group_id}"]

  get_password_data       = true
  user_data               = "${data.local_file.windows_userdata.content}"

  tags = {
    Name                  = "${var.resource_prefix}${element(var.node_names, count.index)}"
  }

  connection {
    type      = "winrm"
    port      = 5985
    password  = "${rsadecrypt(self.password_data, var.ssh_key_pem)}"
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
