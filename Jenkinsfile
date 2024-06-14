#!/usr/bin/env groovy

pipeline {
  agent { label 'executor-v2-huge' }

  options {
    ansiColor('xterm')
    timestamps()
    buildDiscarder(logRotator(daysToKeepStr: '30'))
  }

  parameters {
    booleanParam(
      name: 'RUN_UPGRADE_TEST',
      defaultValue: false,
      description: 'Whether or not to run upgrade tests (default: true)'
    )
    string(name: 'FROM', description: 'Version to upgrade from', defaultValue: '')
    string(name: 'TO', description: 'Version to upgrade to', defaultValue: '')
    booleanParam(
      name: 'RUN_REPLICATION_TEST_APPLIANCE',
      defaultValue: true,
      description: 'Whether or not to run replication tests (default: true)'
    )
    booleanParam(
      name: 'RUN_REPLICATION_TEST_K8S',
      defaultValue: true,
      description: 'Whether or not to run replication tests (default: true)'
    )
    string(
      name: 'REPLICATION_APPLIANCE_VERISON',
      defaultValue: "5.0-stable",
      description: 'Determine which version to use during the replication tests',
    )
    string(
      name: 'REPLICATION_K8S_FOLLOWER_VERISON',
      defaultValue: "edge",
      description: 'Determine which version of the Kubernetes Follower to use during the replication tests',
    )
    string(
      name: 'REPLICATION_FOLLOWER_COUNT',
      defaultValue: "2",
      description: 'Determine how many Followers to deploy during replication tests',
    )
    string(
      name: 'REPLICATION_K8S_FOLLOWER_COUNT',
      defaultValue: "2",
      description: 'Determine how many K8S Followers to deploy during replication tests -- this is separate from REPLICATION_FOLLOWER_COUNT due to resource constraints in KinD in CI',
    )
    string(
      name: 'REPLICATION_CONFIGURE_FOLLOWER_TIMEOUT',
      defaultValue: "1200",
      description: 'Determine the max length of seconds that any one Follower can be configured -- replication tests will fail if this time is exceeded',
    )
    string(
      name: 'REPLICATION_POLICY_COUNT',
      defaultValue: "2",
      description: 'Determine the number of policies are created for replication tests',
    )
    string(
      name: 'REPLICATION_SECRET_COUNT',
      defaultValue: "2",
      description: 'Determine the number of secrets created per policy for replication tests. Total number of secrets = REPLICATION_POLICY_COUNT * REPLICATION_SECRET_COUNT',
    )
    string(
      name: 'REPLICATION_MAX_ATTEMPTS',
      defaultValue: "10",
      description: 'Determine how many attempts the replication test should use when testing if a secret is replicated. There is a 3 second sleep buffer between each attempt',
    )
  }

  stages {
    stage('Run upgrade test') {
      when {
        allOf {
          expression { env.RUN_UPGRADE_TEST }
          expression { env.FROM }
          expression { env.TO }
        }
      }
      steps {
        sh './bin/upgrade-test "${FROM}" "${TO}"'
      }
    }

    stage('Run replication test - Appliance') {
      when { expression { return params.RUN_REPLICATION_TEST_APPLIANCE } }
      environment {
        FOLLOWER_COUNT = "${params.REPLICATION_FOLLOWER_COUNT}"
        VERSION = "${params.REPLICATION_APPLIANCE_VERISON}"
        MAX_ATTEMPTS = "${params.REPLICATION_MAX_ATTEMPTS}"
        CONFIGURE_FOLLOWER_TIMEOUT = "${params.REPLICATION_CONFIGURE_FOLLOWER_TIMEOUT}"
        POLICY_COUNT = "${params.REPLICATION_POLICY_COUNT}"
        SECRET_COUNT = "${params.REPLICATION_SECRET_COUNT}"
      }
      steps {
        sh './bin/replication-test'
      }
    }

    stage('Run replication test - K8S') {
      when { expression { return params.RUN_REPLICATION_TEST_K8S } }
      environment {
        FOLLOWER_COUNT = "${params.REPLICATION_K8S_FOLLOWER_COUNT}"
        VERSION = "${params.REPLICATION_APPLIANCE_VERISON}"
        MAX_ATTEMPTS = "${params.REPLICATION_MAX_ATTEMPTS}"
        CONFIGURE_FOLLOWER_TIMEOUT = "${params.REPLICATION_CONFIGURE_FOLLOWER_TIMEOUT}"
        K8S_FOLLOWER_TAG = "${params.REPLICATION_K8S_FOLLOWER_VERISON}"
        POLICY_COUNT = "${params.REPLICATION_POLICY_COUNT}"
        SECRET_COUNT = "${params.REPLICATION_SECRET_COUNT}"
      }
      steps {
        sh './bin/replication-test-k8s'
      }
    }
  }

  post {
    always {
      script {
        archiveArtifacts artifacts: 'tmp/artifacts/*.tgz', allowEmptyArchive: true, onlyIfSuccessful: false
        sh "./bin/dap --stop"
        cleanupAndNotify(currentBuild.currentResult, '#conjur-core')
      }
    }
  }
}
