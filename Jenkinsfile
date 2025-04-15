#!/usr/bin/env groovy

pipeline {
  agent { label 'executor-v2' }

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
    stage('Run upgrade test') {
      when {
        allOf {
          expression { env.FROM }
          expression { env.TO }
        }
      }
      steps {
        sh './bin/upgrade-test "${FROM}" "${TO}"'
      }
    }
  }

  post {
    always {
      script {
        cleanupAndNotify(currentBuild.currentResult, '#conjur-core')
      }
    }
  }
}
