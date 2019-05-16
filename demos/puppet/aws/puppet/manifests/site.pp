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
