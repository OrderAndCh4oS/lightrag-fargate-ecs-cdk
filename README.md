# LightRAG AWS ECS Deployment

This project provides an AWS CDK stack for deploying the [LightRAG](https://github.com/HKUDS/LightRAG) API on AWS ECS Fargate with HTTPS support using an Application Load Balancer. It allows you to run the LightRAG API in a scalable and secure manner on AWS infrastructure.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
    - [Clone the Repository](#clone-the-repository)
    - [Install Dependencies](#install-dependencies)
    - [Configure Environment Variables](#configure-environment-variables)
- [AWS SSM Parameter Store](#aws-ssm-parameter-store)
    - [Create SSM Parameters](#create-ssm-parameters)
- [AWS CDK Deployment](#aws-cdk-deployment)
    - [Bootstrap CDK](#bootstrap-cdk)
    - [Deploy the Stack](#deploy-the-stack)
- [Running Locally](#running-locally)
    - [Build Docker Image](#build-docker-image)
    - [Run Docker Container](#run-docker-container)
- [API Usage](#api-usage)
    - [Example Requests](#example-requests)
- [License](#license)
- [Contributing](#contributing)

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 20 or above)
- [npm](https://www.npmjs.com/)
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate permissions
- [AWS CDK](https://aws.amazon.com/cdk/) (version 2 or above)
- [Docker](https://www.docker.com/)
- [Python](https://www.python.org/) (version 3.12 or above)
- [pip](https://pip.pypa.io/en/stable/)

Ensure you have access to:

- An AWS account with permissions to create resources (EC2, ECS, SSM, Certificate Manager, Route53, etc.)
- A registered domain name hosted in Route53 (for creating SSL certificates and DNS records)

## Setup

### Clone the Repository

```bash
git clone https://github.com/your-username/light-rag-aws-ecs.git
cd light-rag-aws-ecs
```

### Install Dependencies

Install the npm dependencies:

```bash
npm install
```

### Configure Environment Variables

Copy the `.env.example` file to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Edit the `.env` file and set the following variables:

```ini
# Domain name for the SSL certificate
CERTIFICATE_DOMAIN_NAME=www.example.com

# Your Route53 hosted zone domain name (e.g., example.com)
HOSTED_ZONE_NAME=example.com

# Your Route53 hosted zone ID
HOSTED_ZONE_ID=Z000000000000000

# The subdomain or domain name for the A record (e.g., www.example.com)
A_RECORD_NAME=www.example.com

# OpenAI API Key
OPENAI_API_KEY=sk-xxxxxxx

# LightRAG working directory
WORKING_DIR=index_default

# LLM model to use
LLM_MODEL=gpt-4o-mini

# Embedding model to use
EMBEDDING_MODEL=text-embedding-3-large

# Maximum token size for embeddings
EMBEDDING_MAX_TOKEN_SIZE=8192
```

**Note:** Replace the placeholder values with your actual configuration.

## AWS SSM Parameter Store

### Create SSM Parameters

The AWS CDK stack reads configuration from AWS Systems Manager (SSM) Parameter Store. To create the necessary parameters, run the following script:

```bash
node ./scripts/create-ssm-params.mjs
```

This script reads the environment variables from your `.env` file and creates the corresponding SSM parameters:

- `/api/certificateDomainName`
- `/api/hostedZoneId`
- `/api/hostedZoneName`
- `/api/aRecordName`

**Note:** While it's best practice to avoid using `.env` files in production, this script is included for convenience during development to populate some of the values.

## AWS CDK Deployment

### Bootstrap CDK

If you haven't already bootstrapped AWS CDK in your AWS account and region, do so by running:

```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

Replace `ACCOUNT-NUMBER` and `REGION` with your AWS account number and desired region (e.g., `us-east-1`).

### Deploy the Stack

Deploy the CDK stack:

```bash
cdk deploy
```

This will:

- Create a VPC and ECS Cluster
- Build the Docker image from the `src` directory
- Deploy the FastAPI application as an ECS Fargate service behind an Application Load Balancer
- Set up HTTPS using AWS Certificate Manager
- Create DNS records in Route53 to point your domain to the load balancer

## Running Locally

If you wish to run the application locally using Docker:

### Build Docker Image

Navigate to the `src` directory and build the Docker image:

```bash
cd src
docker build -t light-rag-api .
cd ..
```

### Run Docker Container

Run the Docker container:

```bash
docker run --env-file .env -p 8000:80 light-rag-api
```

The application will be accessible at `http://localhost:8000`.

## API Usage

The FastAPI application provides the following endpoints:

- **POST /query**: Query the LightRAG model.
- **POST /insert**: Insert text into the model's knowledge base.
- **POST /insert_file**: Upload and insert content from a file.
- **GET /health**: Health check endpoint.

### Example Requests

**1. Query:**

```bash
curl -X POST "http://localhost:8000/query" \
     -H "Content-Type: application/json" \
     -d '{"query": "Your question here", "mode": "hybrid"}'
```

**2. Insert Text:**

```bash
curl -X POST "http://localhost:8000/insert" \
     -H "Content-Type: application/json" \
     -d '{"text": "Your text here"}'
```

**3. Insert File:**

```bash
curl -X POST "http://localhost:8000/insert_file" \
     -F 'file=@/path/to/your/file.txt'
```

**4. Health Check:**

```bash
curl -X GET "http://localhost:8000/health"
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
