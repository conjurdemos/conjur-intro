# Conjur AWS Authentication Demo

## Overview
This demonstration highlights the ability of Conjur to leverage existing AWS IAM roles as a mechanism of authentication.


## The Demo

1. Log into Conjur
2. Show Authenticator Policy
3. Show RDS Rotator
4. Lambda API endpoint to retrieve RDS credentials



## The Parts

* Conjur V5 Appliance
  * Image uploaded to an S3 bucket - jv-conjur-demo
  * EC2 instance (or ECS instance?) - ami-a4dc46db

* RDS Instance

* Lambda Function
  -

IAM Role
  -


## Actions
* Pull down most recent Conjur Appliance and save it to a `tar` file.
  ```sh
  $ docker pull registry.tld/conjur-appliance:5.0.0-rc1
  $ docker save -o conjur-v5-rc1.tar registry.tld/conjur-appliance:5.0.0-rc1
  ```
* Create an S3 bucket (ex. `conjur-development-releases`)
* Created Role (`conjur-role`) with policy permission to access the S3 bucket to download the Conjur Image:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:ListBucket"],
        "Resource": ["arn:aws:s3:::conjur-development-releases"]
      },
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject"
        ],
        "Resource": ["arn:aws:s3:::conjur-development-releases/*"]
      }
    ]
  }
  ```

* Upload tar (ex. `conjur-v5-rc1.tar`) into the S3 bucket.
* Make sure you have the pem for EC2 instance:
  ```sh
  $ cp ~/Downloads/jason-conjur-test.pem .
  $ chmod 600 jason-conjur-test.pem
  $ ssh -i jason-conjur-test.pem ubuntu@54.166.128.130

  # run on EC2 Instance
  $ sudo apt-get update
  $ sudo apt install -y awscli
  $ sudo mkdir /src
  $ sudo aws s3 cp s3://jv-conjur-demo/conjur-v5-stable.tar /src/

  $ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
  $ sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
  $ sudo apt-get update
  $ sudo apt-get install -y docker-ce

  $ sudo docker load --input /src/conjur-v5-stable.tar
  $ sudo docker run --name conjur -d --restart=always --security-opt seccomp:unconfined -p "443:443" registry2.itci.conjur.net/conjur-appliance:5.0-stable



   -e ""
  $ sudo docker exec -it conjur bash
  $ nano /opt/conjur/etc/conjur.conf
  CONJUR_AUTHENTICATORS=authn,authn-iam/staging

  sudo docker exec conjur evoke configure master -h ec2-34-229-66-195.compute-1.amazonaws.com -p secret demo


  api_key=$(curl -k --user admin:secret https://localhost/authn/demo/login)
  raw_token=$(curl -k -X POST -d "$api_key" https://localhost/authn/demo/admin/authenticate)
  token=$(echo -n $raw_token | base64 | tr -d '\r\n')

  curl -k -H "Authorization: Token token=\"$token\"" https://localhost/authenticators

  ```

* Load Policy (locally, after setting the `host` variable in the `./cli` file)
  ```
  ./cli conjur policy load --replace root policy/users.yml
  ./cli conjur policy load root policy/policy.yml
  ./cli conjur policy load root policy/staging-iam-policy.yml
  ./cli conjur policy load root policy/staging-myapp.yml
  ./cli conjur policy load staging/foo policy/database.yml

  ./cli conjur policy load root policy/entitlements.yml
  ./cli conjur variable values add staging/postgres-database/url test-url
  ```

Launch a remote node
  ```
  $ ssh -i jason-conjur-test.pem ubuntu@54.161.236.106
  $ sudo apt-get update
  $ sudo apt-get install -y ruby ruby-dev build-essential

  $ scp -i jason-conjur-test.pem cli_cache/conjur-demo.pem ubuntu@54.161.236.106:/home/ubuntu/conjur-demo.pem


  $ sudo gem install sinatra --no-rdoc --no-ri
  $ sudo gem install aws-sdk --no-rdoc --no-ri
  $ sudo gem install conjur-api --no-rdoc --no-ri
  ```

Ruby test code
```ruby
require 'aws-sigv4'
require 'aws-sdk'
require 'conjur-api'

Conjur.configuration.account = 'demo'
Conjur.configuration.appliance_url = 'https://ec2-54-166-128-130.compute-1.amazonaws.com'
Conjur.configuration.authn_url = Conjur.configuration.appliance_url +  '/authn-iam/staging'
Conjur.configuration.cert_file = '/home/ubuntu/conjur-demo.pem'
Conjur.configuration.apply_cert_config!

def conjur
  @conjur ||= begin
    request = Aws::Sigv4::Signer.new(
      service: 'sts',
      region: 'us-east-1',
      credentials_provider: Aws::InstanceProfileCredentials.new
    ).sign_request(
      http_method: 'GET',
      url: 'https://sts.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15'
    ).headers
    Conjur::API.new_from_key('host/staging-myapp/888977921603/staging-myapp-ec2', request.to_json)
  end
end

def database_connection
  {    
    username: conjur.resource('demo:variable:staging/postgres-database/username').value,
    password: conjur.resource('demo:variable:staging/postgres-database/password').value
    url: conjur.resource('demo:variable:staging/postgres-database/url').value
  }
end

require 'sinatra'

get '/' do
  <<-eos
  <h1>Conjur Credentials using AWS IAM Authorization</h1>
  <table>
    <tr>
      <th>Url</th>
      <td>#{database_connection[:url]}</td>
    </tr>
    <tr>
      <th>Username</th>
      <td>#{database_connection[:username]}</td>
    </tr>
    <tr>
      <th>Url</th>
      <td>#{database_connection[:password]}</td>
    </tr>
  </table>
eos
end
```
