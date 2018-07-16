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
Created Role (conjur-role) with policy:
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

docker save -o conjur-v5-rc1.tar registry.tld/conjur-appliance:5.0.0-rc1

cp ~/Downloads/jason-conjur-test.pem .
chmod 600 jason-conjur-test.pem
ssh -i jason-conjur-test.pem ubuntu@34.232.68.235

sudo apt-get update
sudo apt install -y awscli
sudo mkdir /src
sudo aws s3 cp s3://jv-conjur-demo/conjur-v5-rc1.tar /src/

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get update
sudo apt-get install -y docker-ce

sudo docker load --input /src/conjur-v5-rc1.tar
sudo docker run --name conjur -d --restart=always --security-opt seccomp:unconfined -p "443:443" -e "CONJUR_AUTHENTICATORS=authn-iam/staging" registry.tld/conjur-appliance:5.0.0-rc1
sudo docker exec conjur evoke configure master -h ec2-34-224-2-198.compute-1.amazonaws.com -p secret demo


# Load Policy (locally, after setting the `host` variable in the `./cli` file)
./cli conjur policy load --replace root policy/users.yml
./cli conjur policy load root policy/policy.yml
./cli conjur policy load root policy/staging-iam-policy.yml
./cli conjur policy load root policy/staging-myapp.yml
./cli conjur policy load staging policy/database.yml
./cli conjur policy load root policy/entitlements.yml
./cli conjur variable values add staging/postgres-database/url test-url

# Remote node
ssh -i jason-conjur-test.pem ubuntu@52.87.89.237
sudo apt-get update
sudo apt-get install -y ruby ruby-dev build-essential

scp -i jason-conjur-test.pem cli_cache/conjur-demo.pem ubuntu@52.87.89.237:/home/ubuntu/conjur-demo.pem


sudo gem install sinatra --no-rdoc --no-ri
sudo gem install aws-sdk --no-rdoc --no-ri
sudo gem install conjur-api --no-rdoc --no-ri

```
require 'aws-sigv4'
require 'aws-sdk'

request = Aws::Sigv4::Signer.new(
  service: 'sts',
  region: 'us-east-1',
  credentials_provider: Aws::InstanceProfileCredentials.new
).sign_request(
  http_method: 'GET',
  url: 'https://sts.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15'
).headers

require 'conjur-api'

Conjur.configuration.account = 'demo'
Conjur.configuration.appliance_url = 'https://ec2-34-224-2-198.compute-1.amazonaws.com'
Conjur.configuration.authn_url = Conjur.configuration.appliance_url +  '/authn-iam/staging'
Conjur.configuration.cert_file = '/home/ubuntu/conjur-demo.pem'
Conjur.configuration.apply_cert_config!

# conjur = Conjur::API.new_from_key 'host/myapp/011915987442/MyApp', request.to_json
conjur = Conjur::API.new_from_key('host/staging-myapp/F888977921603/staging-myapp-ec2', request.to_json)
conjur.token

#resource("cucumber:variable:db-password").value
username = conjur.resource('cucumber:variable:myapp/database/username').value
password = conjur.resource('cucumber:variable:myapp/database/password').value

print("\nUsername: #{username}  Password: #{password}\n\n")

# Conjur.configuration.account = 'demo'
# Conjur.configuration.appliance_url = 'https://ec2-34-224-2-198.compute-1.amazonaws.com'
# Conjur.configuration.cert_file = '/home/ubuntu/conjur-demo.pem'
# Conjur.configuration.apply_cert_config!

# conjur = Conjur::API.new_from_key('host/staging-myapp/F888977921603/staging-myapp-ec2', request.to_json)
# conjur.token
```
