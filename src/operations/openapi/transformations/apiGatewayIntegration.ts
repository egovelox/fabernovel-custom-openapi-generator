import { OpenAPIV3 } from "openapi-types";
import { ConfigOpenApiTransformationApiGatewayIntegration } from "../../../core/config/types/internal";
import { Method } from "../../../types/methods";

export function applyApiGatewayIntegration(
  document: OpenAPIV3.Document,
  apiGatewayIntegrationOptions: ConfigOpenApiTransformationApiGatewayIntegration
): OpenAPIV3.Document {
  document = applyRouteIntegration(
    document,
    apiGatewayIntegrationOptions.proxyBaseUrl,
    apiGatewayIntegrationOptions.routeIntegration
  );

  if (apiGatewayIntegrationOptions.securitySchemesExtensions !== undefined) {
    document = applySecurityExtensions(
      document,
      apiGatewayIntegrationOptions.securitySchemesExtensions
    );
  }

  if (apiGatewayIntegrationOptions.binaryMediaTypes !== undefined) {
    document = {
      ...document,
      // The openapi-types typings does not allow extensions (x-*)
      // @ts-ignore
      "x-amazon-apigateway-binary-media-types":
        apiGatewayIntegrationOptions.binaryMediaTypes,
    };
  }

  return document;
}

function applyRouteIntegration(
  document: OpenAPIV3.Document,
  proxyBaseUrl: string,
  routeIntegration: ConfigOpenApiTransformationApiGatewayIntegration["routeIntegration"]
): OpenAPIV3.Document {
  const pathKeys = Object.keys(document.paths);

  pathKeys.map(function addApiGatewayIntegrationToPath(pathKey) {
    try {
      const currentPathObject = document.paths[pathKey];
      const httpMethods = Object.keys(currentPathObject) as Method[];
      httpMethods.map(function addApiGatewayIntegrationToMethod(httpMethod) {
        const pathParameters = (
          currentPathObject[httpMethod]?.parameters || []
        ).filter((pathParameter) =>
          pathParameterFilter(pathParameter, pathKey, httpMethod)
        ) as OpenAPIV3.ParameterObject[];

        const defaultIntegration = makeApiGatewayIntegrationObject({
          method: httpMethod,
          // can't use path's methods here since they will break the scheme (http:// -> http:/)
          uri: proxyBaseUrl.replace(/\/$/,'') + '/' + pathKey.replace(/^\//, ''),
          pathParameters,
        });

        const integration = routeIntegration(
          { path: pathKey, method: httpMethod },
          defaultIntegration
        );

        // The openapi-types typings does not allow extensions (x-*)
        // @ts-ignore
        currentPathObject[httpMethod][
          "x-amazon-apigateway-integration"
        ] = integration;
      });
    } catch (e) {
      console.error(
        `Could not add ApiGateway integration to route ${pathKey}\n`
      );
      throw e;
    }
  });

  return document;
}

function makeApiGatewayIntegrationObject({
  method,
  uri,
  pathParameters,
}: {
  method: Method;
  uri: string;
  pathParameters: OpenAPIV3.ParameterObject[];
}) {
  // TODO: check if required: false pathParameters should not be cached and proxied

  return {
    type: "http_proxy",
    httpMethod: method.toUpperCase(),
    uri,
    passthroughBehavior: "when_no_match",
    timeoutInMillis: null,
    cacheKeyParameters: pathParameters.map(
      (pathParameter) => `integration.request.path.${pathParameter.name}`
    ),
    requestParameters: pathParameters.reduce(
      (requestParametersObject, pathParameter) => {
        return {
          ...requestParametersObject,
          [`integration.request.path.${pathParameter.name}`]: `method.request.path.${pathParameter.name}`,
        };
      },
      {}
    ),
  };
}

function isParameterObject(
  parameter: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject
): parameter is OpenAPIV3.ParameterObject {
  return parameter.hasOwnProperty("in");
}

function pathParameterFilter(
  parameter: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject,
  path: string,
  method: Method
): boolean {
  if (isParameterObject(parameter)) {
    return parameter.in === "path";
  } else {
    console.info(
      `${method.toUpperCase()} ${path}: Reference path parameters are not supported for ApiGatewayIntegration, skipping.`
    );
    return false;
  }
}

function applySecurityExtensions(
  document: OpenAPIV3.Document,
  securitySchemesExtensions: NonNullable<
    ConfigOpenApiTransformationApiGatewayIntegration["securitySchemesExtensions"]
  >
): OpenAPIV3.Document {
  if (document.components === undefined) {
    console.error(
      "OpenApi document does not have a `components` object. Please add it to your file."
    );
    process.exit(1);
  } else if (document.components.securitySchemes === undefined) {
    console.error(
      "OpenApi does not have `securitySchemes` defined. Cannot apply `securitySchemesExtensions`."
    );
    process.exit(1);
  } else {
    document.components.securitySchemes = Object.keys(
      securitySchemesExtensions
    ).reduce((securitySchemesObject, securitySchemesExtensionsKey) => {
      return {
        ...securitySchemesObject,
        [securitySchemesExtensionsKey]: {
          ...securitySchemesObject[securitySchemesExtensionsKey],
          ...(securitySchemesExtensions[securitySchemesExtensionsKey] || {}),
        },
      };
    }, document.components.securitySchemes);
  }
  return document;
}
