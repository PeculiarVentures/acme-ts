# ts-acme


## Develop

[Lena](https://github.com/lerna/lerna#readme)

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

Git and Lerna
```ts
git init
lerna init
```

Add to lerna.json
```ts
{
  "npmClient": "yarn",
  "packages": [
    "packages/*"
  ],
  "version": "0.0.0",
  "useWorkspaces": true
}
```

Add to package.json
```ts
"workspaces": [
    "packages/*"
  ],
```

Yarn
```ts
yarn
```

### Create packages

Schema
```
packages
  |-project_1
  |-project_2
  |-project_3
```

Then in each folder call the command
```ts
yarn init -y
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