import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  AwsSdkCall,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources";
import { IApiKey } from "aws-cdk-lib/aws-apigateway";

export interface GetApiKeyCrProps {
  apiKey: IApiKey;
}

export class GetApiKeyCr extends Construct {
  apikeyValue: string;

  constructor(scope: Construct, id: string, props: GetApiKeyCrProps) {
    super(scope, id);

    const apiKey: AwsSdkCall = {
      service: "APIGateway",
      action: "getApiKey",
      parameters: {
        apiKey: props.apiKey.keyId,
        includeValue: true,
      },
      physicalResourceId: PhysicalResourceId.of(`APIKey:${props.apiKey.keyId}`),
    };

    const apiKeyCr = new AwsCustomResource(this, "api-key-cr", {
      policy: AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [props.apiKey.keyArn],
          actions: ["apigateway:GET"],
        }),
      ]),
      logRetention: RetentionDays.ONE_DAY,
      onCreate: apiKey,
      onUpdate: apiKey,
    });

    apiKeyCr.node.addDependency(props.apiKey);
    this.apikeyValue = apiKeyCr.getResponseField("value");
  }
}
