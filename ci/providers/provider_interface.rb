# frozen_string_literal: true

module CI
  module Providers
    # This class implements the minimal set of methods a Provider must implement
    # to ensure scenarios can be run.
    class ProviderInterface
      # def master_api; end
      #
      # def follower_api; end

      def provision_master(version:, with_load_balancer: true); raise 'method not implemen' end

      def provision_follower(version:, with_load_balancer: true); end

      def reset_environment; end

      def import_custom_certificates; end

      def teardown; end

      def provision_standbys(version:); end

      def enable_autofailover; end

      def trigger_auto_failover; end

      def wait_for_healthy_master; end

      def last_audit_event; end

      def upgrade_master(version:); end
    end
  end
end
