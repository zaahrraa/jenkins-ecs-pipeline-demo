pipeline {
    agent any

    environment {
        AWS_REGION     = 'us-east-1'
        AWS_ACCOUNT_ID = '097346687563' 
        ECR_REPO       = 'jenkins-ecs-demo-app'
        IMAGE_TAG      = "${env.BUILD_NUMBER}"
        ECR_URI        = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
        ECS_CLUSTER    = 'jenkins-demo-cluster'
        ECS_SERVICE    = 'jenkins-demo-service'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'Code checked out successfully'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${ECR_REPO}:${IMAGE_TAG} ."
                echo 'Docker image built successfully'
            }
        }

        stage('Test') {
            steps {
                sh "docker run --rm ${ECR_REPO}:${IMAGE_TAG} npm test"
                echo 'Tests passed!'
            }
        }

        stage('Push to ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-creds'
                ]]) {
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | \
                        docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

                        docker tag ${ECR_REPO}:${IMAGE_TAG} ${ECR_URI}:${IMAGE_TAG}
                        docker tag ${ECR_REPO}:${IMAGE_TAG} ${ECR_URI}:latest

                        docker push ${ECR_URI}:${IMAGE_TAG}
                        docker push ${ECR_URI}:latest
                    """
                    echo 'Image pushed to ECR successfully'
                }
            }
        }

        stage('Deploy to ECS') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-creds'
                ]]) {
                    sh """
                        aws ecs update-service \
                          --cluster ${ECS_CLUSTER} \
                          --service ${ECS_SERVICE} \
                          --force-new-deployment \
                          --region ${AWS_REGION}
                    """
                    echo '🚀 Deployment triggered!'
                }
            }
        }
    }

    post {
        success {
            echo '🎉 Pipeline succeeded! New version is live!'
        }
        failure {
            echo '❌ Pipeline failed - check logs for details'
        }
    }
}
