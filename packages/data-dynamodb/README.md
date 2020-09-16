# `data-dynamodb`

> TODO: description

## Usage

```ts
import * as data from "@peculiar/acme-data-dynamodb";
import { container } from "tsyaringe";

data.DependencyInjection.register(container, {
  accessKeyId: "AWS_ACCESS_KEY_ID",
  secretAccessKey: "AWS_ACCESS_KEY",
  region: "local",
  endpoint: "http://localhost:8000",
});
// TODO: DEMONSTRATE API
```

## Data structure

Account
```ts
{
  id:                   { "S": String },
  index:                { "S": "acct#" },
  parentId:             { "S": String }, //KeyThumbprint
  createdAt:            { "S": String },
  termsOfServiceAgreed: { "BOOL": Boolean },
  key: {
      "M": {
        key_ops: { "L": [{ "S": String }] },
        ext: { "BOOL": Boolean },
        kty: { "S": String },
        alg: { "S": String },
        e:   { "S": String },
        n:   { "S": String }
        ...others
      }
  },
  contacts: { "L": [{ "S": String }] },
  status: { "S": String }
},
```

Order
```ts
{
  id:             { "S": String },
  index:          { "S": "order#HashIdentifier#Data" },
  parentId:       { "S": String }, //AccountId
  identifier:     { "S": String },
  expires:        { "S": String },
  authorizations: { "L": [{ "S": String }] },
  status:         { "S": String }
  certificate: { "M": {
                  thumbprint: { "S": String },
                  id: { "S": String },
                  rawData: { "S": String },
                  status: { "S": String }
                }
  },
},
```

Link for find order by certificate thumbprint
```ts
{
  id:       { "S": String }, //CertificateThumbprint
  index:    { "S": "cert#" },
  parentId: { "S": String }, //OrderId
},
```

Authorization
```ts
{
  id:         { "S": String },
  index:      { "S": "authz#HashIdentifier#Data" },
  parentId:   { "S": String }, //AccountId
  status:     { "S": String }
  expires:    { "S": String },
  orders:     { "L": [{ "S": String }] }, //OrderId[]
  identifier: { "M": {
                  type: { "S": String },
                  value: { "S": String }
              }
  },
}
```

Challenge
```ts
{
  id:        { "S": String },
  index:     { "S": "challenge#" },
  parentId:  { "S": String }, //AuthorizationId
  validated: { "S": String },
  errorId:   { "S": String },
  type:      { "S": String },
  status:    { "S": String },
  token:     { "S": String }
}
```