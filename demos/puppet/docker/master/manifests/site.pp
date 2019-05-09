
node default {
  notify { 'a-message-from-our-sponsors':
    message => "$hostname"
  }


  class { 'conjur':
    account            => 'conjur',
    appliance_url      => 'http://conjur',
    authn_login        => "host/$hostname",
    host_factory_token => Sensitive('35ngv5z27y1m0j1tzp47f1jv9e0k2hk928kydcbkj18qmnn72e7j4qs'),
    version            => 5
  }

  $secret = conjur::secret('my-secret')

  $non_secret = $secret.unwrap

   notify { 'a-secret-message':
    message => "${non_secret}"
  }

  file { '/secret.txt':
    ensure  => file,
    content => $secret, # this correctly handles both Sensitive and String
    mode    => '0600' # remember to limit reading
  }
}
