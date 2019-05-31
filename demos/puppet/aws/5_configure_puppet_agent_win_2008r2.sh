#!/bin/bash -eu

function message() {
    printf '\e[1;34m%-6s\e[m\n\n' "$1"
  }

: ${SSH_KEY_FILE?"Need to set SSH_KEY_FILE"}

PUPPET_AGENT_PUBLIC_DNS=$(terraform output puppet_agent_win_2008R2_public_dns)
PUPPET_AGENT_AWS_ID=$(terraform output puppet_agent_win_2008R2_aws_id)
PUPPET_MASTER_HOST=$(terraform output puppet_master_public_dns)
PUPPET_MASTER_PRIVATE_IP=$(terraform output puppet_master_private_ip)

message "1) Remote desktop to ${PUPPET_AGENT_PUBLIC_DNS}"
password=$(aws ec2 get-password-data \
           --instance-id ${PUPPET_AGENT_AWS_ID} \
           --priv-launch-key "${SSH_KEY_FILE}" \
           | jq -r .PasswordData)

echo "    Username: Administrator"
echo "    Password: $password"
echo

message "... press any key when this step is complete."
read -n 1

message "2) Run this script in an elevated powershell prompt:"

cat <<EOF
-------------------------------------------------------

\$puppetMasterPrivateIp = "${PUPPET_MASTER_PRIVATE_IP}"
\$agentNodeName = "agent-win-2008r2.puppet"

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
ssh -i "${SSH_KEY_FILE}" \
    -o "StrictHostKeyChecking no" \
    "ec2-user@${PUPPET_MASTER_HOST}" /bin/bash << EOF
  
  until sudo /opt/puppetlabs/bin/puppet cert list 2>/dev/null | grep agent-win-2008r2.puppet; do
    echo "Waiting for CSR..."
    sleep 2
  done

  echo "Signing CSR..."
  sudo /opt/puppetlabs/bin/puppet cert sign agent-win-2008r2.puppet
EOF

message "Run 'puppet agent --test' to immediately apply configuration."
