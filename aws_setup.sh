#!/bin/bash
# SkyeView AWS EC2 Deployment script for Ubuntu Server

# Exit immediately if a command exits with a non-zero status
set -e

echo "============================================="
echo "   Installing Docker & Prerequisites...   "
echo "============================================="

# Update package database
sudo apt-get update -y

# Install tools
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw

# Add Docker’s official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Allow current user to run Docker commands without sudo
sudo usermod -aG docker $USER

# Set up firewall rules
echo "============================================="
echo "   Configuring Firewall (Ports 80 & 22)...   "
echo "============================================="
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP Web Server'
sudo ufw allow 8000/tcp comment 'FastAPI Backend API'
sudo ufw --force enable

echo "============================================="
echo "   Deployment Environment Setup Complete!    "
echo "============================================="
echo "Please log out and log back in to apply Docker group permissions, then start your containers by running:"
echo ""
echo "  docker compose -f docker/docker-compose.yml up --build -d"
echo ""
