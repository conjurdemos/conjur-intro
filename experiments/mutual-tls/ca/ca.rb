require 'sinatra/base'
require 'logger'
require 'conjur/api'

require 'base64'
require 'json'
# require 'date'

require './lib/signer'

class MyApp < Sinatra::Base

  def conjur_api
    @conjur_api ||= begin
      OpenSSL::SSL::SSLContext::DEFAULT_CERT_STORE.add_file('/dap-certs/dap-master.pem')
      Conjur.configuration.account = 'demo'
      Conjur.configuration.appliance_url = "https://dap-master/api"
      api_key = Conjur::API.login('admin', 'MySecretP@ss1')
      Conjur::API.new_from_key('admin', api_key)
    end
  end

  def extract_host_from_token(authorization:)
    token = authorization.split('=')[1]
    host_attributes = JSON.parse(Base64.decode64(JSON.parse(Base64.decode64(token))['payload']))
    expires_at = Time.at(host_attributes['iat'].to_i)

    # token should only be valid for 5 minutes
    return host_attributes['sub'].gsub(/host\//, '') if Time.now - expires_at < 300
  end

  set :bind, '0.0.0.0'
  set :logging, Logger::DEBUG

  post '/ca/*' do
    # logger.info(request.env)
    host = extract_host_from_token(authorization: request.env['HTTP_AUTHORIZATION'])

    Signer.new(
      api: conjur_api,
      logger: logger,
      account: Conjur.configuration.account
    ).sign(
      resource: params['splat'].join('/'),
      client_name: host,
      csr: request.body.read
    ).to_json

    # Base64.encode64(certificate)

    # CFSSL.new(
    #   ca_cert: IO.read('/certs/database-1/database-1.pem'),
    #   ca_key: IO.read('/certs/database-1/database-1-key.pem'),
    #   configuration: IO.read('/opt/cfssl/cfssl/config.json'),
    #   profile: 'intermediate_ca',
    #   logger: logger
    # ).sign(csr: request.body.read)
  end

  run! if app_file == $0
end
