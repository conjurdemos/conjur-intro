require './lib/cfssl'
require './lib/authorize'

class Signer
  def initialize(api:, logger:, account:)
    @api = api
    @logger = logger
    @account = account
  end


  def host_ca?(client:, certificate_authority:)
    ca_id = "#{@account}:webservice:#{certificate_authority}/certificate-authentication"
    @logger.info("Signer#host_ca? : webservice: #{ca_id}")
    ca_owner = @api.resource(ca_id).owner.owner.to_s
    @logger.info("Signer#host_ca? : owner: #{ca_owner}")

    host_id = "#{@account}:host:#{client}"
    @logger.info("Signer#host_ca? : role: #{host_id}")
    host_owner = @api.resource(host_id).owner.to_s
    @logger.info("Signer#host_ca? : owner: #{host_owner}")

    result = ca_owner == host_owner
    # result = @api.role(ca_id).permitted?('x509-signing', role: host_id)
    @logger.info("Signer#host_ca? : result for host: #{client}, cert authority: #{certificate_authority}/certificate-authentication: #{result}")
    result
  end

  def sign(resource:, csr:, client_name:)
    cfssl = CFSSL.new(logger: @logger)

    @logger.info @api.inspect
    return nil unless Authorize.new(
      api: @api,
      logger: @logger,
      account: @account
    ).authorized?(
      # client: cfssl.common_names(csr: csr),
      client: client_name,
      certificate_authority: resource
    )

    if host_ca?(client: client_name, certificate_authority: resource)
      profile = 'server'
    else
      profile = 'client'
    end

    signed_certificate = cfssl.sign(
      # ca_cert: IO.read('/certs/database-1/database-1.pem'),
      # ca_key: IO.read('/certs/database-1/database-1-key.pem'),
      ca_cert: @api.resource("demo:variable:#{resource}/certificate-authentication/certificate").value,
      ca_key: @api.resource("demo:variable:#{resource}/certificate-authentication/private-key").value,
      configuration: IO.read('/opt/cfssl/cfssl/config.json'),
      csr: csr,
      profile: profile
    )

    response = {
      certificate: Base64.encode64(signed_certificate),
      certificate_chain: Base64.encode64(
        @api.resource(
          "demo:variable:#{resource}/certificate-authentication/certificate-chain"
        ).value
      )
    }
    @logger.info response.inspect
    response
  end
end
