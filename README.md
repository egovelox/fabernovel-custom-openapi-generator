# openapi-generator

From an OpenAPI file, generate apigateway files or code.

## Getting started

### Configuration

#### Parameters

By default, openapi-generator will rely on your project package.json to get the following information:
- `name`
- `version`

It is possible to bypass or override these values by providing arguments when calling the program.

Example:
```
yarn openapi-generator --name Hello --version 2.3.4
```

An extra parameter is available: `mode`. It allows you to customise the configuration based on a given string.
This will only work if the configuration exports a function.

Example:
```
yarn openapi-generator --mode production
```

#### Configuration

Create an `openapi-generator.config.js` file in your project.
It can be located in any subfolder. However, the cli must be executed in the same folder or below to be detected.

It can follow one of the following naming conventions:
- `openapi-generator.config.js`, `openapi-generator.config.cjs` (recommended)
- `openapi-generator` in package.json
- `.openapi-generatorrc` (yaml or json)
- `.openapi-generator.json`, `.openapi-generator.yaml`, `.openapi-generator.yml`, `.openapi-generator.js`, `.openapi-generator.cjs`

All files must export an object with the schema defined below.

For `.js` config files, you can export a function which returns the aforementioned object:

```javascript
module.exports = function({ mode }) {
  return {
    input: "path/to/openapi.yaml",
    ...
  }
}
```

##### API

##### Config
| parameter          | type                                                            | required | description                                               |
|--------------------|-----------------------------------------------------------------|----------|-----------------------------------------------------------|
| input              | string                                                          | required | input path to openapi file (json or yaml)                 |
| normalizeInput     | (input: OpenAPIV3.Document, config: Config): OpenAPIV3.Document | optional | Normalize the openapi before being used by the operations |
| operations         | Operations                                                      | required |                                                           |
| operations.openapi | OpenAPIOperation                                                | optional |                                                           |
| operations.codegen | CodegenOperation                                                | optional |                                                           |

##### OpenAPIOperation
| parameter                                                      | type                                                                                                                               | required/optional | description                                                                                                |
|----------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|-------------------|------------------------------------------------------------------------------------------------------------|
| output                                                         | `string`                                                                                                                           | required          | ouput path with filename                                                                                   |
| dryRun                                                         | `boolean`                                                                                                                          | optional (false)  | Generate the openapi file but do not save it on disk                                                       |
| validateSchema                                                 | `boolean `                                                                                                                         | optional (true)   | Validate the openapi schema when loading and saving the file                                               |
| preTransform                                                   | `(input: OpenAPIV3.Document, config: Config) => OpenAPIV3.Document`                                                                | optional          | Transform the openapi file before transformations                                                          |
| postTransform                                                  | `(input: OpenAPIV3.Document, config: Config) => OpenAPIV3.Document`                                                                | optional          | Transform the openapi file after transformations                                                           |
| transformation                                                 | `object`                                                                                                                           | optional          |                                                                                                            |
| transformation.cors                                            | `(path: string, cors: object) => object`                                                                                           | optional          | Add and customise cors per route                                                                           |
| transformation.securitySchemes                                 | `object`                                                                                                                           | optional          |                                                                                                            |
| transformation.securitySchemes.scheme                          | `Record<string, object>`                                                                                                           | required          | OpenApi [security scheme object](https://swagger.io/docs/specification/authentication/)                    |
| transformation.securitySchemes.filterSecurity                  | <code>(path: string, method: Method, security: Array<Record<string, string[]>>) => Array<Record<string, string[]>> \| false</code> | optional          | Customise the security and the scopes on a per route basis. Routes are secured with no scopes by default   |
| transformation.apiGatewayIntegration                           | `object`                                                                                                                           | optional          |                                                                                                            |
| transformation.apiGatewayIntegration.proxyBaseUrl              | `string`                                                                                                                           | required          | The base url for proxied requests                                                                          |
| transformation.apiGatewayIntegration.routeIntegration          | `(route: { path: string, method: Method }, extension: object) => object`                                                           | required          | Customise the provided route extensions on a per route basis. Routes are secured with no scopes by default |
| transformation.apiGatewayIntegration.securitySchemesExtensions | `Record<string, object>`                                                                                                           | optional          | Add extensions to the provided `operations.openapi.transformation.securitySchemes.scheme` securities       |
| transformation.apiGatewayIntegration.binaryMediaTypes          | `string[]`                                                                                                                         | optional          | A list of binary MIME types                                                                                |

##### CodegenOperation
| parameter | type                                                                                                                            | required | description                                       |
|-----------|---------------------------------------------------------------------------------------------------------------------------------|----------|---------------------------------------------------|
| output    | `string`                                                                                                                        | required | ouput path with filename                          |
| type      | <code>"typings" \| "contracts" \| "fastify" \| ["fastify", { iotsRouter?: boolean (false), noSchemas?: boolean (false) }]</code> | required | Generate files based on provided type and options |

<details>
<summary>Example configuration</summary>

```typescript
module.exports = function ({ mode }) {
  return {
    input: "./openapi.yml",
    operations: {
      openapi: {
        output: "generated/apigateway.yaml.tpl",
        transformation: {
          cors: (path, cors) => cors,
          securitySchemes: {
            scheme: {
              openapi: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT"
              },
            },
            filterSecurity: (path, method, security) => security,
          },
          apiGatewayIntegration: {
            proxyBaseUrl: "${URL}",
            routeIntegration: (route, extension) => extension,
            securitySchemesExtensions: {
              openapi: {
                "x-amazon-apigateway-authtype": "cognito_user_pools",
                "x-amazon-apigateway-authorizer": {
                  type: "cognito_user_pools",
                  providerARNs: ["${ARN_COGNITO_HTAG}"],
                },
              },
            },
            binaryMediaTypes: ["image/*"],
          },
        },
      },
      codegen: {
        output: "example/generated",
        type: "fastify",
      },
    },
  };
};
```
</details>
