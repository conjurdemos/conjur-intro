node 'agent-linux.puppet' {
    class { 'conjur':
        account            => 'puppet',
        appliance_url      => 'https://[USER PROVIDED VALUE]',
        authn_login        => "host/$hostname",
        host_factory_token => Sensitive('[USER PROVIDED VALUE]'),
        ssl_certificate    => ['[USER PROVIDED VALUE]'],
        version            => 5
      }

     package { 'httpd':
       ensure  => "installed",
     }
     service { 'httpd':
       ensure => running,
       enable => true
     }

    $secret = conjur::secret('my-secret')

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
    content => 'Hello from Conjur Puppet for Windows Server 2008R2 Agent!'
  }

}

node 'agent-win-core.puppet' {

  windowsfeature { ['Web-Server','Web-WebServer']:
    ensure => present,
  }

  file { 'C:\\inetpub\wwwroot\index.html':
    ensure => file,
    content => 'Hello from Conjur Puppet for Windows Server Core Agent!'
  }

}
