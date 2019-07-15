# Update OS
yum -y update

# Configure NTP
yum -y install ntp ntp update
ntpdate 0.centos.pool.ntp.org
systemctl start ntpd
systemctl enable ntpd

# Disable SELinux
#
# Disabling SE linux per https://www.howtoforge.com/tutorial/centos-puppet-master-and-agent/
# TODO: Revisit if this is actually required
sed -i "s/^SELINUX.*/SELINUX=disabled/" /etc/sysconfig/selinux

# Install Puppet Master
rpm -Uvh https://yum.puppet.com/puppet6-release-el-7.noarch.rpm
yum -y install puppetserver

/opt/puppetlabs/bin/puppet config set dns_alt_names "master.puppet,puppet" --section master

/opt/puppetlabs/bin/puppet config set certname    "master.puppet" --section main
/opt/puppetlabs/bin/puppet config set server      "master.puppet" --section main
/opt/puppetlabs/bin/puppet config set environment "production"    --section main
/opt/puppetlabs/bin/puppet config set runinterval "30"            --section main
/opt/puppetlabs/bin/puppet config set autosign    "true"          --section main

systemctl start puppetserver
systemctl enable puppetserver

/opt/puppetlabs/bin/puppet module install puppet/windowsfeature
/opt/puppetlabs/bin/puppet module install puppetlabs/stdlib
/opt/puppetlabs/bin/puppet module install cyberark-conjur
