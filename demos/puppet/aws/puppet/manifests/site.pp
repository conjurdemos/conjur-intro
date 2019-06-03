class { 'conjur':
        account            => 'puppet',
        appliance_url      => strip(file('conjur_config/appliance_url')),
        authn_login        => "host/$hostname",
        host_factory_token => Sensitive(strip(file('conjur_config/host_factory_token'))),
        ssl_certificate    => file('conjur_config/conjur.pem')
      }

    $secret = conjur::secret('my-secret')


node 'agent-linux.puppet' {
    

     package { 'httpd':
       ensure  => "installed",
     }
     service { 'httpd':
       ensure => running,
       enable => true
     }

     file { '/var/www/html/index.html':
       ensure => file,
       content => "Hello from Conjur Puppet for AWS Linux Agent! Secret is '${secret.unwrap}'"
    }
}

node 'agent-win-2008r2.puppet' {

  windowsfeature { ['Web-Server','Web-WebServer']:
    ensure => present,
  }

  file { 'C:\\inetpub\wwwroot\index.html':
    ensure => file,
    content => "Hello from Conjur Puppet for Windows Server 2008R2 Agent! Secret is '${secret.unwrap}'"
  }

}

node 'agent-win-core.puppet' {

  windowsfeature { ['Web-Server','Web-WebServer']:
    ensure => present,
  }

  file { 'C:\\inetpub\wwwroot\index.html':
    ensure => file,
    content => "Hello from Conjur Puppet for Windows Server 2019 Core Agent! Secret is '${secret.unwrap}'"
  }

}

node 'agent-win-2019.puppet' {

  windowsfeature { ['Web-Server','Web-WebServer']:
    ensure => present,
  }

  file { 'C:\\inetpub\wwwroot\index.html':
    ensure => file,
    content => "Hello from Conjur Puppet for Windows Server 2019 Agent! Secret is '${secret.unwrap}'"
  }

}
