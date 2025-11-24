# frozen_string_literal: true

require './ci/providers/provider_interface'

require 'json'
require 'net/https'
require 'uri'


module CI
  module Providers
    # CI::Providers::DockerCompose enables Cucumber features to be run against
    # DAP configured in Docker Compose.
    #
    # The DockerCompose class implements the public methods for the generic
    # CI::Providers::Interface using Docker Compose.
    class DockerCompose < ProviderInterface

      def initialize(logger:)
        @logger = logger
      end

      def provision_master(version:, with_load_balancer: true)
        system('cp files/haproxy/master/single/haproxy.cfg files/haproxy/master/haproxy.cfg')
        system({ 'VERSION' => version }, 'docker compose up -d --no-deps conjur-master.mycompany.local conjur-master-1.mycompany.local')
        args = [
          'evoke configure master',
          '--accept-eula',
          '--hostname conjur-master.mycompany.local',
          '--master-altnames conjur-master-1.mycompany.local,conjur-master-2.mycompany.local,conjur-master-3.mycompany.local',
          '--admin-password MySecretP@ss1',
          'demo'
        ].join(' ')
        system("docker compose exec conjur-master-1.mycompany.local bash -c '#{args}'")
      end

      def provision_follower(version:, with_load_balancer: true)
        system({ 'VERSION' => version }, 'docker compose up --no-deps --detach conjur-follower-1.mycompany.local')
        system('docker compose exec conjur-master-1.mycompany.local bash -c "evoke seed follower conjur-follower.mycompany.local > /opt/cyberark/dap/seeds/follower-seed.tar"')
        system('docker compose exec conjur-follower-1.mycompany.local bash -c "evoke unpack seed /opt/cyberark/dap/seeds/follower-seed.tar && evoke configure follower"')

        # Start Load Balancer
        system('docker compose up -d --no-deps conjur-follower.mycompany.local')
      end

      def reset_environment
        system('bin/dap --stop')
      end

      def import_custom_certificates
        system('bin/dap --import-custom-certificates')
      end

      def provision_standbys(version:)
        system("bin/dap --provision-standbys --version #{version}")
      end

      def enable_autofailover
        system('bin/dap --enable-auto-failover')
      end

      def trigger_auto_failover
        system('bin/dap --trigger-failover')
      end

      def master_connection
        @connection ||= begin
          http = Net::HTTP.new('conjur-master.mycompany.local', 443)
          http.use_ssl = true
          http.verify_mode = OpenSSL::SSL::VERIFY_NONE
          http
        end
      end

      def wait_for_healthy_master(sleep_for: 10)
        sleep(5)
        loop do
          begin
            response = master_connection.request(Net::HTTP::Get.new('/health'))
            if response.is_a?(Net::HTTPSuccess)
              response_message = JSON.parse(response.body)

              # Not sure if this is a bug, but following an auto-failover, we
              # sometimes see the following in health:
              # ```
              # ...
              # "cluster": {
              #   "ok": true,
              #   "status": "standing_by",
              #   "message": null
              # },
              # "ok": true
              # ```
              # It seems to reset relatively quickly to the following:
              # ```
              # ...
              # "cluster": {
              #     "ok": true,
              #     "status": "running",
              #     "message": "acting as master"
              #   },
              #   "ok": true
              # ```
              if response_message['ok'] &&
                 response_message['cluster']['status'] == 'running'
                break
              end
            else
              sleep(sleep_for)
            end
          rescue Exception => e
            sleep(sleep_for)
          end
        end
      end

      def current_master
        response = master_connection.request(Net::HTTP::Get.new('/info'))
        return nil unless response.is_a?(Net::HTTPSuccess)

        conjur_info = JSON.parse(response.body)['configuration']['conjur']

        if conjur_info.key?('cluster_master')
          return conjur_info['cluster_master']
        end

        'conjur-master-1.mycompany.local'
      end

      def last_audit_event
        last_audit = `docker compose exec #{current_master} bash -c "tail -n 1 /var/log/conjur/audit.json"`

        return JSON.parse(last_audit) unless last_audit.nil?
      end

      def upgrade_master(version:)
        system("bin/dap --upgrade-master #{version}")
      end
    end
  end
end
