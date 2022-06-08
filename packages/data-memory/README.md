# `@peculiar/acme-data-memory`

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![npm version](https://badge.fury.io/js/%40peculiar%2Facme-data-memory.svg)](https://badge.fury.io/js/%40peculiar%2Facme-data-mmory)

- [About](#about)
- [Installation](#installation)
- [Usage](#usage)

## About

Memory data module forAutomatic Certificate Management Environment (ACME) implementing RFC 8555 framework.

## Installation

```
npm install @peculiar/acme-data-memory
```

## Usage

```js
import * as data from "@peculiar/acme-data-memory";
import { container } from "tsyringe";

// Register services in dependency injection container
data.DependencyInjection.register(container);
```
