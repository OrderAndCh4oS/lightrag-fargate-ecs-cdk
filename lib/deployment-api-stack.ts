import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager";
import {ARecord, HostedZone, RecordTarget} from "aws-cdk-lib/aws-route53";
import {LoadBalancerTarget} from "aws-cdk-lib/aws-route53-targets";
import {ApplicationProtocol} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {ApplicationLoadBalancedFargateService} from 'aws-cdk-lib/aws-ecs-patterns';
import {Cluster, ContainerImage, DeploymentControllerType, LogDrivers} from "aws-cdk-lib/aws-ecs";
import {Vpc} from 'aws-cdk-lib/aws-ec2';
import {RetentionDays} from 'aws-cdk-lib/aws-logs';
import {StringParameter} from "aws-cdk-lib/aws-ssm";
import {Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {Platform} from "aws-cdk-lib/aws-ecr-assets";
import {config} from "dotenv";
import {resolve} from "node:path";

config();

export type ApiStackProps = {
    certificateDomainNameParameterName: string;
    hostedZoneIdParameterName: string;
    hostedZoneNameParameterName: string;
    aRecordNameParameterName: string;
} & cdk.StackProps;

export class DeploymentApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        const certificateDomainName = StringParameter.fromStringParameterName(this, 'CertificateDomainName', props.certificateDomainNameParameterName);
        const hostedZoneId = StringParameter.fromStringParameterName(this, 'HostedZoneId', props.hostedZoneIdParameterName);
        const hostedZoneName = StringParameter.fromStringParameterName(this, 'HostedZoneName', props.hostedZoneNameParameterName);
        const aRecordName = StringParameter.fromStringParameterName(this, 'ARecordName', props.aRecordNameParameterName);

        const publicZone = HostedZone.fromHostedZoneAttributes(
            this,
            "HttpsFargateAlbPublicZone",
            {
                zoneName: hostedZoneName.stringValue,
                hostedZoneId: hostedZoneId.stringValue,
            }
        );

        const certificate = new Certificate(this, "ApiHttpsFargateAlbCertificate", {
            domainName: certificateDomainName.stringValue,
            validation: CertificateValidation.fromDns(publicZone),
        });

        const vpc = new Vpc(this, "ApiVpc");

        const cluster = new Cluster(this, 'ApiCluster', {
            vpc,
            containerInsights: true
        });

        const image = ContainerImage.fromAsset(
            resolve(__dirname, '../src'),
            {platform: Platform.LINUX_AMD64}
        );

        const ecrPolicyStatement = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'ecr:GetAuthorizationToken',
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
            ],
            resources: ['*'],
        });


        // Todo: It would be better to read from secrets manager
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('Environment variable OPENAI_API_KEY is required but was not found.');
        }

        if (!process.env.WORKING_DIR) {
            throw new Error('Environment variable WORKING_DIR is required but was not found.');
        }

        if (!process.env.LLM_MODEL) {
            throw new Error('Environment variable LLM_MODEL is required but was not found.');
        }

        if (!process.env.EMBEDDING_MODEL) {
            throw new Error('Environment variable EMBEDDING_MODEL is required but was not found.');
        }

        if (!process.env.EMBEDDING_MAX_TOKEN_SIZE) {
            throw new Error('Environment variable EMBEDDING_MAX_TOKEN_SIZE is required but was not found.');
        }

        const fargate = new ApplicationLoadBalancedFargateService(this, 'ApiAlbFargate', {
            cluster,
            taskImageOptions: {
                image,
                containerPort: 80,
                logDriver: LogDrivers.awsLogs({
                    streamPrefix: id,
                    logRetention: RetentionDays.ONE_MONTH,
                }),
                environment: {
                    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
                    WORKING_DIR: process.env.WORKING_DIR,
                    LLM_MODEL: process.env.LLM_MODEL,
                    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
                    EMBEDDING_MAX_TOKEN_SIZE: process.env.EMBEDDING_MAX_TOKEN_SIZE,
                },
            },
            assignPublicIp: true,
            memoryLimitMiB: 512,
            cpu: 256,
            desiredCount: 1,
            deploymentController: {type: DeploymentControllerType.ECS},
            protocol: ApplicationProtocol.HTTPS,
            certificate,
            redirectHTTP: true
        });

        fargate.taskDefinition.addToExecutionRolePolicy(ecrPolicyStatement);

        fargate.targetGroup.configureHealthCheck({
            path: '/health',
            interval: cdk.Duration.seconds(60),
            healthyThresholdCount: 2,
            unhealthyThresholdCount: 5,
        });

        new ARecord(this, "ApiHttpsFargateAlbARecord", {
            zone: publicZone,
            recordName: aRecordName.stringValue,
            target: RecordTarget.fromAlias(
                new LoadBalancerTarget(fargate.loadBalancer)
            ),
        });
    }
}
