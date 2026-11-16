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
        # bin/dap also prepares the follower's cert files for its HAProxy; without
        # them the follower load balancer exits with "No Private Key found".
        system("bin/dap --provision-follower --version #{version}")
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

        # A promoted leader reports `cluster_leader`; `cluster_master` is the
        # older key. With neither, the node is not in a cluster and master-1 is
        # the only leader.
        %w[cluster_leader cluster_master].each do |key|
          return conjur_info[key] if conjur_info.key?(key)
        end

        'conjur-master-1.mycompany.local'
      end

      # Most recent audit event for `resource` on the current leader, or nil.
      # Requests served by a follower reach the leader's audit log
      # asynchronously and interleaved with login/authenticate events, so the
      # event is searched for in recent lines and retried while it arrives.
      def last_audit_event(resource:, attempts: 10, delay: 3)
        attempts.times do
          lines = `docker compose exec #{current_master} bash -c "tail -n 200 /var/log/conjur/audit.json"`.lines
          events = lines.map { |line| JSON.parse(line) rescue nil }.compact
          match = events.reverse.find { |event| event.dig('subject@43868', 'resource') == resource }
          return match if match

          sleep(delay)
        end

        nil
      end

      def upgrade_master(version:)
        system("bin/dap --upgrade-master #{version}")
      end
    end
  end
end
