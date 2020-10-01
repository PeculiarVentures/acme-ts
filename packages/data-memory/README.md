# `@peculiar/acme-data-memory`

- [About](#about)
- [Installation](#installation)
- [Usage](#usage)

## About

Memory data module for Automatic Certificate Management Environment (ACME) framework.

## Installation

```
npm install @peculiar/acme-data-memory
```

## Usage

```js
import * as data from "@peculiar/acme-data-memory";
import { container } from "tsyaringe";

// Register services in dependency injection container
data.DependencyInjection.register(container);
```
