class CFSSL
  def initialize(logger:)
    @logger = logger
  end

  def common_names(csr:)
    csr_information(csr: csr)['DNSNames']
  end

  def csr_information(csr:)
    begin
      csr_file = convert_string_to_temp_file(content: csr)
      JSON.parse(
        `cfssl certinfo -csr #{csr_file}`
      )
    ensure
      cleanup_file(file: csr_file)
    end
  end

  def sign(csr:, ca_cert:, ca_key:, configuration:, profile:)
    ca_pem = convert_string_to_temp_file(content: ca_cert)
    ca_key = convert_string_to_temp_file(content: ca_key)
    config = convert_string_to_temp_file(content: configuration)
    csr = convert_string_to_temp_file(content: csr)

    begin
      str = `cfssl sign -ca #{ca_pem.path} -ca-key #{ca_key.path} -config #{config.path} -profile #{profile} #{csr.path}`
      @logger.info "response: #{str}"
      JSON.parse(str)['cert']
    ensure
      cleanup_file(file: ca_pem)
      cleanup_file(file: ca_key)
      cleanup_file(file: config)
      cleanup_file(file: csr)
    end

    # cfssl sign \
    #   -ca $cas/database-1/database-1.pem \
    #   -ca-key $cas/database-1/database-1-key.pem \
    #   -config $config/config.json \
    #   -profile intermediate_ca \
    #   $certs/application-1/application-1.csr | \
    #   cfssljson \
    #     -bare $certs/application-1/application-1-to-database-1
  end

  def convert_string_to_temp_file(content:)
    file = Tempfile.new
    file.write(content)
    file.flush
    file
  end

  def cleanup_file(file:)
    file.close
    file.unlink
  end

end
