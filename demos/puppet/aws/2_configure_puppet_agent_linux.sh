#!/bin/bash -eu

# Reference: https://www.howtoforge.com/tutorial/centos-puppet-master-and-agent/

PUPPET_MASTER_HOST=$(terraform output puppet_master_public_dns)
PUPPET_AGENT_LINUX_HOST=$(terraform output puppet_agent_linux_public_dns)

PUPPET_MASTER_PRIVATE_DNS=$(terraform output puppet_master_private_dns)
PUPPET_AGENT_LINUX_PRIVATE_DNS=$(terraform output puppet_agent_linux_private_dns)

PUPPET_MASTER_PRIVATE_IP=$(terraform output puppet_master_private_ip)
PUPPET_AGENT_LINUX_PRIVATE_IP=$(terraform output puppet_agent_linux_private_ip)

ssh -i ~/.ssh/micahlee.pem \
    -o "StrictHostKeyChecking no" \
    "ec2-user@${PUPPET_AGENT_LINUX_HOST}" /bin/bash << EOF

  function update_host() {
    local ip=\$1
    local dns=\$2
    grep -q "^\$ip" /etc/hosts && sudo sed -i "s/^\$ip.*/\$ip \$dns/" /etc/hosts || echo "\$ip \$dns" | sudo tee --append /etc/hosts
  }

  function message() {
    printf '\\e[1;34m--> %-6s\\e[m\n\n' "\$1"
  }

  message 'Configuring Puppet DNS'
  update_host ${PUPPET_MASTER_PRIVATE_IP} master.puppet
  update_host ${PUPPET_AGENT_LINUX_PRIVATE_IP} agent-linux.puppet
  cat /etc/hosts

  message 'Updating OS'
  sudo yum -y update

  message 'Configuring NTP'
  sudo yum -y install ntp ntp update
  sudo ntpdate 0.centos.pool.ntp.org
  sudo systemctl start ntpd
  sudo systemctl enable ntpd

  # Disabling SE linux per https://www.howtoforge.com/tutorial/centos-puppet-master-and-agent/
  # TODO: Revisit if this is actually required
  message 'Disabling SELinux'
  sudo sed -i "s/^SELINUX.*/SELINUX=disabled/" /etc/sysconfig/selinux

  message 'Installing Puppet'
  sudo rpm -Uvh https://yum.puppetlabs.com/puppet5/puppet5-release-el-7.noarch.rpm

  sudo yum -y install puppet-agent

  sudo /opt/puppetlabs/bin/puppet config set certname "agent-linux.puppet" --section main
  sudo /opt/puppetlabs/bin/puppet config set server "master.puppet" --section main
  sudo /opt/puppetlabs/bin/puppet config set environment "production" --section main
  sudo /opt/puppetlabs/bin/puppet config set runinterval "30" --section main

  sudo /opt/puppetlabs/bin/puppet resource service puppet ensure=running enable=true
EOF

# Connect to master to sign CSR
ssh -i ~/.ssh/micahlee.pem \
    -o "StrictHostKeyChecking no" \
    "ec2-user@${PUPPET_MASTER_HOST}" /bin/bash << EOF
  sudo /opt/puppetlabs/bin/puppet cert sign agent-linux.puppet
EOF
