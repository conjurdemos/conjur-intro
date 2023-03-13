require 'aws-sigv4'
require 'aws-sdk'
require 'conjur-api'

request = Aws::Sigv4::Signer.new(
  service: 'sts',
  region: 'us-east-1',
  credentials_provider: Aws::InstanceProfileCredentials.new
).sign_request(
  http_method: 'GET',
  url: 'https://sts.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15'
).headers

Conjur.configuration.account = 'demo'
Conjur.configuration.appliance_url = 'https://ec2-34-224-2-198.compute-1.amazonaws.com'
Conjur.configuration.authn_url = Conjur.configuration.appliance_url +  '/authn-iam/staging'
Conjur.configuration.cert_file = '/home/ubuntu/conjur-server.pem'
Conjur.configuration.apply_cert_config!

# conjur = Conjur::API.new_from_key 'host/myapp/011915987442/MyApp', request.to_json
conjur = Conjur::API.new_from_key('host/staging-myapp/888977921603/staging-myapp-ec2', request.to_json)
conjur.token

#resource("cucumber:variable:db-password").value
username = conjur.resource('cucumber:variable:myapp/database/username').value
password = conjur.resource('cucumber:variable:myapp/database/password').value

print("\nUsername: #{username}  Password: #{password}\n\n")
