module.exports = function () {
  return {
    input: "example/openapi.yml",
    operations: {
      openapi: {
        output: "example/generated/apigateway.yaml",
        transformation: {
          cors: (path, cors) => cors,
          securitySchemes: {
            scheme: {
              openapi: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
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
