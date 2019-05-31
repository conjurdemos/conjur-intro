$puppetMasterPrivateIp = "${puppet_master_private_ip}"
$agentNodeName = "${node_name}"

# Modify hosts file
Write-Output "Modify hosts file"
$hostsPath = "$env:windir\System32\drivers\etc\hosts"
$puppetMasterPrivateIp + "`t`tmaster.puppet" | Out-File -encoding ASCII -append $hostsPath

# Download Puppet Agent
Write-Output "Download Puppet"
$puppetAgentPackage = "https://downloads.puppetlabs.com/windows/puppet5/puppet-agent-x64-latest.msi"
$output = "puppet-agent-x64-latest.msi"
Invoke-WebRequest -Uri $puppetAgentPackage -OutFile $output

# Install Puppet Agent
Write-Output "Install Puppet"
$MSIArguments = @(
    "/i"
    $output
    "/qn"
    "/norestart"
    "PUPPET_MASTER_SERVER=master.puppet"
    "PUPPET_AGENT_CERTNAME=$agentNodeName"
)
Start-Process "msiexec.exe" -LoadUserProfile -ArgumentList $MSIArguments -Wait -NoNewWindow

while (!(Test-Path "C:\ProgramData\PuppetLabs\puppet\etc\puppet.conf")) { Start-Sleep 10 }

Write-Output "Update Run Interval"
$runInterval = @" 
[agent]
  runinterval = 30
"@ 

Add-Content -Path "C:\ProgramData\PuppetLabs\puppet\etc\puppet.conf" -Value $runInterval

Write-Output "Restart Puppet Agent Service"
sc stop puppet
sc start puppet
