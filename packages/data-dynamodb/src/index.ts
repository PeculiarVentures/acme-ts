export * from "./repositories";
export * from "./dependency";

import * as dynamoose from "dynamoose";
const ddb = new dynamoose.aws.sdk.DynamoDB({
  "accessKeyId": "12345678",
  "secretAccessKey": "12345678",
  "region": "local",
  "endpoint": "http://localhost:8000",
});

// Set DynamoDB instance to the Dynamoose DDB instance
dynamoose.aws.ddb.set(ddb);