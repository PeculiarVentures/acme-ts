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
