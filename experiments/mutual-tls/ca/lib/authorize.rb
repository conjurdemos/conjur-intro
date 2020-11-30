class Authorize
  def initialize(api:, logger:, account:)
    @api = api
    @logger = logger
    @account = account
  end

  def authorized?(client:, certificate_authority:)
    ca_id = "#{@account}:webservice:#{certificate_authority}/certificate-authentication"
    @logger.info("Authorize#authorized? : webservice: #{ca_id}")

    host_id = "#{@account}:host:#{client}"
    @logger.info("Authorize#authorized? : role: #{host_id}")

    result = @api.role(ca_id).permitted?('x509-signing', role: host_id)
    @logger.info("Authorize#authorized? : result for host: #{client}, cert authority: #{certificate_authority}/certificate-authentication: #{result}")
    result
  end

end
