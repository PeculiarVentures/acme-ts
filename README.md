# ts-acme
Provides client and server implementations of ACME (RFC 8555) in TypeScript. It enables you to build solutions that provide complete and robust certificate lifecycle management.

## Develop

[Lerna](https://github.com/lerna/lerna#readme)

### Install

Install Lerna
```ts
npm install -g lerna
```

Install Yarn
```ts
npm install -g yarn
```

### Initialization

```ts
yarn
```

### Create packages

```ts
lerna create name-project
```

### Dependency manage

Install module/project in all projects
```ts
lerna add name-module-or-project
```

Install module/project in one project
```ts
lerna add name-module-or-project --scope=@peculiar/acme-client
```

To remove a module from project, you must delete an entry in the package.json

### build only changed packages
```ts
lerna run build --since name-branch
```
