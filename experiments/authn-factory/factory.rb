require 'sinatra/base'
require 'logger'
require 'conjur/api'

require 'json'
require 'erb'

# require './lib/signer'

class Renderer
  def initialize(template_file:, logger:)
    @template_file = template_file
    @logger = logger
  end

  def render(data:)
    result = ERB.new(File.read(@template_file)).result_with_hash(data)
    @logger.info("Renderer#render: #{result}")
    result
  end
end

class Factory < Sinatra::Base
  def conjur_api
    @conjur_api ||= begin
      OpenSSL::SSL::SSLContext::DEFAULT_CERT_STORE.add_file(
        '/dap-certs/dap-master.pem'
      )
      Conjur.configuration.account = 'demo'
      Conjur.configuration.appliance_url = 'https://dap-master/api'
      api_key = Conjur::API.login('admin', 'MySecretP@ss1')
      Conjur::API.new_from_key('admin', api_key)
      # Conjur::API.new_from_token(token)
    end
  end

  # def extract_auth_token(authorization: )
  #   token_header = request.header 'X-Conjur-Token'
  #   JSON.parse Base64.b64decode(token_header)
  # end

  set :bind, '0.0.0.0'
  set :logging, Logger::DEBUG

  post '/authenticators/authn-azure/:authenticator_id' do
    payload = JSON.parse(request.body.read)
    logger.info(payload)

    policy = Renderer.new(
      logger: logger,
      template_file: 'templates/azure/authn.yml.erb'
    ).render(data: { authenticator_identifier: params['authenticator_id'] })
    conjur_api.load_policy('root', policy)

    logger.info("save value: #{payload['provider-uri']}")
    logger.info("to: demo:variable:conjur/authn-azure/#{params['authenticator_id']}/provider-uri")
    conjur_api.resource(
      [
        'demo',
        'variable',
        "conjur/authn-azure/#{params['authenticator_id']}/provider-uri"
      ].join(':')
    ).add_value(payload['provider-uri'])
    content_type :yaml
    policy
  end

  post '/authenticators/authn-azure/:authenticator_id/:workload_identifier' do
    payload = JSON.parse(request.body.read)
    logger.info(payload)

    policy = Renderer.new(
      logger: logger,
      template_file: 'templates/azure/role.yml.erb'
    ).render(
      data: {
        authenticator_identifier: params['authenticator_id'],
        subscription_id: payload['subscription-id'],
        resource_group: payload['resource-group'],
        workload_identifier: params['workload_identifier']
      }
    )
    logger.info(policy)

    logger.info("load policy to: conjur/authn-azure/#{params['authenticator_id']}")
    conjur_api.load_policy(
      "conjur/authn-azure/#{params['authenticator_id']}",
      policy
    )
    content_type :yaml
    policy
  end

  run! if app_file == $0
end
