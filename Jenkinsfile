#!/usr/bin/env groovy

pipeline {
  agent { label 'conjur-enterprise-common-agent' }

  options {
    ansiColor('xterm')
    timestamps()
    buildDiscarder(logRotator(daysToKeepStr: '30'))
  }

  parameters {
    string(name: 'FROM', description: 'Version to upgrade from', defaultValue: '')
    string(name: 'TO', description: 'Version to upgrade to', defaultValue: '')
    booleanParam(name: 'SKIP_DYNAMIC_SECRETS', description: 'If set to true, the exercise for dynamic secrets will not be run after upgrade', defaultValue: false)
  }
  environment {
    SKIP_DYNAMIC_SECRETS = "${params.SKIP_DYNAMIC_SECRETS}"
  }

  stages {
    stage('Get InfraPool ExecutorV2 Agent') {
      steps {
        script {
          // Request ExecutorV2 agents for 1 hour(s)
          infrapool = getInfraPoolAgent.connected(type: "ExecutorV2", quantity: 1, duration: 1)[0]
        }
      }
    }

    stage('Run upgrade test') {
      when {
        allOf {
          expression { env.FROM }
          expression { env.TO }
        }
      }
      steps {
        script {
          infrapool.agentSh "SKIP_DYNAMIC_SECRETS=\"${SKIP_DYNAMIC_SECRETS}\" ./bin/upgrade-test \"${FROM}\" \"${TO}\""
        }
      }
    }

    stage('Copy Enterprise Commit') {
      when {
        allOf {
          branch 'main'
          not { triggeredBy 'TimerTrigger' }
        }
      }
      steps {
        script {
          release.copyEnterpriseCommit(targetOrganization='conjurinc')
        }
      }
    }
  }

  post {
    always {
      script {
        releaseInfraPoolAgent(".infrapool/release_agents")
      }
    }
  }
}
