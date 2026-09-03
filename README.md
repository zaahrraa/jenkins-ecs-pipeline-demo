# Jenkins CI/CD Pipeline: Docker to ECR to ECS

---

## Project Overview

This project implements a complete CI/CD pipeline that automatically builds, tests, and deploys a Dockerized Node.js application to AWS ECS Fargate whenever code is pushed to GitHub.

The pipeline demonstrates how to automate the entire software delivery process using Jenkins as the orchestration tool, Docker for containerization, Amazon ECR for image storage, and Amazon ECS for application deployment.

---

## Architecture

The pipeline follows this flow:

Developer pushes code to GitHub -> GitHub webhook triggers Jenkins -> Jenkins builds Docker image -> Jenkins runs tests -> Jenkins pushes image to Amazon ECR -> Jenkins deploys to Amazon ECS Fargate -> Application becomes live for users

The architecture includes:
- GitHub repository for source code hosting
- Jenkins server running on EC2 instance
- Docker for containerization
- Amazon ECR for Docker image storage
- Amazon ECS Fargate for serverless container deployment
- AWS IAM for security and permissions management

---

## Tech Stack

- Jenkins 2.568.1
- Java 21
- Docker
- AWS EC2
- AWS ECR (Elastic Container Registry)
- AWS ECS Fargate
- GitHub
- Node.js with Express
- AWS IAM

---

## Pipeline Stages

The Jenkins pipeline consists of five main stages:

**1. Checkout**
Downloads the source code from GitHub repository

**2. Build Docker Image**
Creates a Docker container image with the application and its dependencies

**3. Test**
Runs npm tests inside the container to validate the application

**4. Push to ECR**
Authenticates with AWS ECR and pushes the Docker image with both version tag and latest tag

**5. Deploy to ECS**
Triggers a new deployment in ECS to pull the latest image and restart the service

---

## Key Learnings

This project taught valuable lessons in DevOps engineering:

CI/CD Pipeline Design: Understanding how to structure a pipeline that moves code from repository to production with automated testing and deployment

Container Orchestration: Using Docker for consistent application packaging and AWS ECS Fargate for serverless container management

AWS IAM Security: Configuring roles and policies with least-privilege access for CI/CD tools

Troubleshooting: Developing systematic debugging approach for infrastructure and application issues

Infrastructure as Code: Managing cloud resources through automated pipelines

---

## Prerequisites

To recreate this project, you will need:

AWS account with permissions to create EC2, ECR, ECS, and IAM resources

GitHub account

Node.js installed locally for testing

Basic familiarity with terminal/command line

---

## Repository Structure

```
jenkins-ecs-pipeline-demo/
├── app/
│   ├── app.js
│   └── package.json
├── Dockerfile
├── Jenkinsfile
├── README.md
└── .gitignore
```

---

## Troubleshooting Guide

During the implementation of this project, we encountered and resolved numerous issues. Here is a comprehensive guide to the problems and their solutions.

---

### Jenkins Installation Issues

**Issue: GPG Key Verification Failed**
When installing Jenkins via APT repository, the system reported NO_PUBKEY error and indicated the repository was not signed. This happened because apt-key is deprecated in newer Ubuntu versions.

Error Message:
NO_PUBKEY 7198F4B714ABFC68
The repository is not signed

Solution:
Abandoned the APT repository method and used direct .deb download:
```
sudo wget https://pkg.jenkins.io/debian-stable/binary/jenkins_2.426.1_all.deb
sudo dpkg -i jenkins_2.426.1_all.deb
sudo apt install -f -y
```

---

**Issue: Missing net-tools Dependency**
The Jenkins .deb installation failed because the net-tools package was missing.

Error Message:
dpkg: dependency problems prevent configuration of jenkins: jenkins depends on net-tools

Solution:
```
sudo apt install -f -y
```

---

**Issue: Plugin Installation Failures**
During the initial Jenkins setup, many suggested plugins failed to install. This occurred because Jenkins tried to install all plugins simultaneously.

Solution:
Clicked Continue and only installed the four essential plugins needed for the project: Docker Pipeline, Amazon ECR, Pipeline AWS Steps, and GitHub Integration.

---

### Java and Jenkins Version Issues

**Issue: Java Version Too Old**
Jenkins 2.426.1 required Java 21 but the system had Java 17 installed.

Error Message:
Running with Java 17 which is older than the minimum required version Java 21

Solution:
```
sudo apt install -y openjdk-21-jre
sudo update-alternatives --set java /usr/lib/jvm/java-21-openjdk-amd64/bin/java
```

---

**Issue: Jenkins Too Old for Plugins**
The Docker Pipeline plugin required Jenkins 2.479 or higher, but the installed version was 2.426.1.

Solution:
Downloaded the Jenkins 2.568.1 .deb package directly and installed it:
```
sudo wget -O /tmp/jenkins_2.568.1.deb https://get.jenkins.io/debian-stable/jenkins_2.568.1_all.deb
sudo dpkg -i /tmp/jenkins_2.568.1.deb
sudo apt install -f -y
sudo systemctl restart jenkins
```

---

**Issue: Jenkins Still Using Java 17**
After installing Java 21, Jenkins continued to use Java 17. This happened because Jenkins needed the JAVA_HOME environment variable configured.

Solution:
Added JAVA_HOME to the Jenkins configuration file:
```
echo "JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64" | sudo tee -a /etc/default/jenkins
sudo systemctl restart jenkins
```

---

### Memory and Performance Issues

**Issue: OOM Killer Terminated Jenkins**
The EC2 t2.micro instance only had 1GB RAM, and Jenkins was being killed by the Out Of Memory killer.

Solution:
Added 2GB swap space:
```
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

**Issue: Jenkins Extremely Slow**
The Manage Jenkins page took 5-10 minutes to load. This was due to memory constraints.

Solution:
Restarted Jenkins and used direct URLs for plugin management and credential configuration instead of navigating through the UI:
- Plugin Manager: http://IP:8080/pluginManager/available
- Credentials: http://IP:8080/credentials/store/system/domain/_/newCredentials

---

**Issue: Built-In Node Offline**
Builds were stuck because the Built-In Node was offline. The root cause was that the tmp directory was almost full with only 471MB free, below the 1GB threshold.

Error Message:
Disk space is below threshold of 1.00 GiB. Only 471.25 MiB out of 475.96 MiB left on /tmp

Solution:
Cleaned up the tmp directory and changed the temp directory:
```
sudo docker system prune -af
sudo rm -rf /tmp/jenkins*
sudo rm -rf /tmp/docker*
sudo rm -f /tmp/jenkins*.deb
sudo rm -f /tmp/winstone*.jar
sudo apt clean
sudo journalctl --vacuum-time=3d

sudo mkdir -p /var/lib/jenkins/tmp
sudo chown jenkins:jenkins /var/lib/jenkins/tmp
```

Added to /etc/default/jenkins:
```
JAVA_ARGS="-Djava.awt.headless=true -Djava.io.tmpdir=/var/lib/jenkins/tmp"
```

Updated service file at /usr/lib/systemd/system/jenkins.service:
```
Environment="JAVA_OPTS=-Djava.awt.headless=true -Djava.io.tmpdir=/var/lib/jenkins/tmp"
```

Then ran:
```
sudo systemctl daemon-reload
sudo systemctl restart jenkins
```

---

### Docker Configuration Issues

**Issue: Docker Not Configured in Jenkins**
The error "Docker URL is not set" indicated that Docker was not properly configured.

Error Message:
Docker URL is not set, docker client won't be initialized

Solution:
- Went to Manage Jenkins -> System -> Docker Builder
- Set Docker URL to: unix:///var/run/docker.sock
- Added global properties:
  - DOCKER_HOST: unix:///var/run/docker.sock
  - PATH: /usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin


---

**Issue: Jenkins Not in Docker Group**
Jenkins could not access the Docker socket.

Solution:
```
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

---

### Pipeline and Build Issues

**Issue: Build Stuck in Queue**
Builds remained stuck with "Waiting for next available executor" message.

Solution:
Fixed the Built-In Node issues described in the Memory and Performance Issues section.

---

**Issue: Build Pausing and Resuming Loop**
Build number 5 kept pausing and resuming repeatedly.

Solution:
Deleted the corrupted build from the Jenkins build directory:
```
sudo rm -rf /var/lib/jenkins/jobs/ecs-deployment-pipeline/builds/5
sudo systemctl restart jenkins
```

---

**Issue: Corrupted Build Data**
The error "program.dat not found" indicated corrupted build data.

Error Message:
java.io.FileNotFoundException: program.dat (No such file or directory)

Solution:
Deleted all builds for the pipeline job and restarted Jenkins:
```
sudo rm -rf /var/lib/jenkins/jobs/ecs-deployment-pipeline/builds/
sudo systemctl restart jenkins
```

---

## Cleanup

To avoid AWS charges, run these cleanup commands:

Delete ECS Service and Cluster:
```
aws ecs update-service --cluster jenkins-demo-cluster --service jenkins-demo-service --desired-count 0
aws ecs delete-service --cluster jenkins-demo-cluster --service jenkins-demo-service
aws ecs delete-cluster --cluster jenkins-demo-cluster
```

Delete ECR Repository:
```
aws ecr delete-repository --repository-name jenkins-ecs-demo-app --force
```

Terminate EC2 Instances from AWS Console.

---
