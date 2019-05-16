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
       content => 'Hello from Conjur Puppet!'
    }
}

node 'agent-win-2008r2.puppet' {

  windowsfeature { ['Web-Server','Web-WebServer']:
    ensure => present,
  }

  file { 'C:\\inetpub\wwwroot\index.html':
    ensure => file,
    content => 'Hello from Conjur Puppet!'
  }

}
