# NOTE: This script must be run as admin

# Obtain this by running `terraform output puppet_master_private_ip` in repo directory
$puppetMasterPrivateIp = "172.31.44.231"
$agentNodeName = "agent-win-core.puppet" # e.g. agent-win-2008R2.puppet

# ---------------------------------------------------------------------------------------

# Modify hosts file
$hostsPath = "$env:windir\System32\drivers\etc\hosts"
#$puppetMasterPrivateIp + "`t`tmaster.puppet" | Out-File -encoding ASCII -append $hostsPath

# Download Puppet Agent
$puppetAgentPackage = "https://downloads.puppetlabs.com/windows/puppet5/puppet-agent-x64-latest.msi"
$output = "$HOME\puppet-agent-x64-latest.msi"

Invoke-WebRequest -Uri $puppetAgentPackage -OutFile $output

# Install Puppet Agent
msiexec /qn /norestart /i $output PUPPET_MASTER_SERVER=master.puppet PUPPET_AGENT_CERTNAME=$agentNodeName
