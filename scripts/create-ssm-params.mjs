import {PutParameterCommand, SSMClient} from "@aws-sdk/client-ssm";

import {config} from "dotenv";
config({path: '../.env'});

const ssmClient = new SSMClient({ region: 'eu-west-1' }); // Replace 'us-east-1' with your desired AWS region

const parameters = [
    {
        Name: '/api/certificateDomainName',
        Value: process.env.CERTIFICATE_DOMAIN_NAME,
        Type: 'String'
    },
    {
        Name: '/api/hostedZoneId',
        Value: process.env.HOSTED_ZONE_ID,
        Type: 'String'
    },
    {
        Name: '/api/hostedZoneName',
        Value: process.env.HOSTED_ZONE_NAME,
        Type: 'String'
    },
    {
        Name: '/api/aRecordName',
        Value: process.env.A_RECORD_NAME,
        Type: 'String'
    }
];

for (const param of parameters) {
    try {
        const command = new PutParameterCommand({...param, Overwrite: true});
        await ssmClient.send(command);
        console.log(`Parameter created successfully: ${param.Name}`);
    } catch (err) {
        console.error(`Error creating parameter: ${param.Name}`, err);
    }
}
