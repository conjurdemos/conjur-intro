#!/bin/bash -eu

function message() {
    printf '\e[1;34m%-6s\e[m\n\n' "$1"
  }

PUPPET_AGENT_PUBLIC_DNS=$(terraform output puppet_agent_win_core_public_dns)
PUPPET_MASTER_HOST=$(terraform output puppet_master_public_dns)
PUPPET_MASTER_PRIVATE_IP=$(terraform output puppet_master_private_ip)

message "1) Remote desktop to ${PUPPET_AGENT_PUBLIC_DNS}"

message "2) Run this script in an elevated powershell prompt:"

cat <<EOF
-------------------------------------------------------

\$puppetMasterPrivateIp = "${PUPPET_MASTER_PRIVATE_IP}"
\$agentNodeName = "agent-win-core.puppet"

# Modify hosts file
\$hostsPath = "\$env:windir\\System32\\drivers\\etc\\hosts"
\$puppetMasterPrivateIp + "\`t\`tmaster.puppet" | Out-File -encoding ASCII -append \$hostsPath

# Download Puppet Agent
\$puppetAgentPackage = "https://downloads.puppetlabs.com/windows/puppet5/puppet-agent-x64-latest.msi"
\$output = "\$HOME\\puppet-agent-x64-latest.msi"
Invoke-WebRequest -Uri \$puppetAgentPackage -OutFile \$output

# Install Puppet Agent
msiexec /qn /norestart /i \$output PUPPET_MASTER_SERVER=master.puppet PUPPET_AGENT_CERTNAME=\$agentNodeName

-------------------------------------------------------

EOF

message "... press any key when this step is complete."
read -n 1

message "3) Signing agent certificate..."
# Connect to master to sign CSR
ssh -i ~/.ssh/micahlee.pem \
    -o "StrictHostKeyChecking no" \
    "ec2-user@${PUPPET_MASTER_HOST}" /bin/bash << EOF
  sudo /opt/puppetlabs/bin/puppet cert sign agent-win-core.puppet
EOF
