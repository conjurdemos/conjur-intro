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
      name: 'RUN_REPLICATION_TEST',
      defaultValue: true,
      description: 'Whether or not to run replication tests (default: true)'
    )
    string(
      name: 'REPLICATION_APPLIANCE_VERISON',
      defaultValue: "5.0-stable",
      description: 'Determine which version to use during the replication tests',
    )
    string(
      name: 'REPLICATION_FOLLOWER_COUNT',
      defaultValue: "2",
      description: 'Determine how many Followers to deploy during replication tests',
    )
    string(
      name: 'REPLICATION_MAX_ATTEMPTS',
      defaultValue: "10",
      description: 'Determine how many attempts the replication test should use when testing if a secret is replicated',
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

    stage('Run replication test') {
      when {
        allOf {
          expression { env.RUN_UPGRADE_TEST }
        }
      }
      environment {
        FOLLOWER_COUNT = "${params.REPLICATION_FOLLOWER_COUNT}"
        VERSION = "${params.REPLICATION_APPLIANCE_VERISON}"
        MAX_ATTEMPTS = "${params.REPLICATION_MAX_ATTEMPTS}"
      }
      steps {
        sh './bin/replication-test'
      }
    }
  }

  post {
    always {
      script {
        sh "./bin/create-log-artifacts --follower-count  ${params.REPLICATION_FOLLOWER_COUNT}"
        archiveArtifacts artifacts: 'tmp/artifacts/*.tgz', allowEmptyArchive: true, onlyIfSuccessful: false
        sh "./bin/dap --stop"
        cleanupAndNotify(currentBuild.currentResult, '#conjur-core')
      }
    }
  }
}
