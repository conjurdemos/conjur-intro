# Reference: https://www.howtoforge.com/tutorial/centos-puppet-master-and-agent/

function update_host() {
  local ip=$1
  local dns=$2
  grep -q "^$ip" /etc/hosts && sudo sed -i "s/^$ip.*/$ip $dns/" /etc/hosts || echo "$ip $dns" | sudo tee --append /etc/hosts
}

echo 'Configuring Puppet DNS'
update_host ${puppet_master_private_ip} master.puppet
cat /etc/hosts

echo 'Updating OS'
yum -y update

echo 'Configuring NTP'
yum -y install ntp ntp update
ntpdate 0.centos.pool.ntp.org
systemctl start ntpd
systemctl enable ntpd

# Disabling SE linux per https://www.howtoforge.com/tutorial/centos-puppet-master-and-agent/
# TODO: Revisit if this is actually required
echo 'Disabling SELinux'
sed -i "s/^SELINUX.*/SELINUX=disabled/" /etc/sysconfig/selinux

echo 'Installing Puppet'
rpm -Uvh https://yum.puppetlabs.com/puppet5/puppet5-release-el-7.noarch.rpm

yum -y install puppet-agent

/opt/puppetlabs/bin/puppet config set certname "${node_name}" --section main
/opt/puppetlabs/bin/puppet config set server "master.puppet" --section main
/opt/puppetlabs/bin/puppet config set environment "production" --section main
/opt/puppetlabs/bin/puppet config set runinterval "${run_interval}" --section main

/opt/puppetlabs/bin/puppet resource service puppet ensure=running enable=true
