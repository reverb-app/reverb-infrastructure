import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ContainerProps } from './containerTypes';
import { FUNCTIONS_URI } from '../../utils/processEnvironment';

export class FnContainer extends Construct {
  constructor(scope: Construct, id: string, props: ContainerProps) {
    super(scope, id);

    const fnImage = ecs.ContainerImage.fromRegistry(FUNCTIONS_URI);

    const fnServiceTaskDef = new ecs.FargateTaskDefinition(
      this,
      'fnService_TaskDef',
      {
        cpu: 512,
        memoryLimitMiB: 1024,
      }
    );

    const fnServiceContainer = fnServiceTaskDef.addContainer(
      'fnService_Container',
      {
        containerName: 'fnServiceContainer',
        image: fnImage,
        memoryLimitMiB: 1024,
        logging: ecs.LogDriver.awsLogs({ streamPrefix: 'fnService' }),
        environment: {
          DATABASE_ENDPOINT: '/function_schema',
        },
        secrets: {
          DB_SECRET: ecs.Secret.fromSecretsManager(props.secret),
        },
      }
    );

    fnServiceContainer.addPortMappings({
      name: 'functions',
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    const fnService = new ecs.FargateService(this, 'fnService', {
      cluster: props.cluster,
      taskDefinition: fnServiceTaskDef,
      serviceName: 'fnService',
      securityGroups: [props.servicesSecurityGroup],
      serviceConnectConfiguration: {
        namespace: props.namespace.namespaceName,
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'fnService-traffic',
        }),
        services: [
          {
            portMappingName: 'functions',
            dnsName: 'ingress_fn',
            port: 3000,
            discoveryName: 'ingress_fn',
          },
        ],
      },
    });

    fnService.connections.allowFrom(
      props.servicesSecurityGroup,
      ec2.Port.tcp(3000),
      'Allow traffic within security group on 3000'
    );
  }
}
