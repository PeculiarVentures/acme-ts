# ts-acme


## Develop

[Lena](https://github.com/lerna/lerna#readme)

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