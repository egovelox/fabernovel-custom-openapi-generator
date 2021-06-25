import {
  OpenApiOperation,
  OpenApiTransformationOperation,
  OpenApiTransformationSecuritySchemeOperation,
  OpenApiTransformationApiGatewayIntegrationOperation,
} from "../types/public";

export function validateOpenApiOperation(
  openapiOperation: Partial<OpenApiOperation>
): OpenApiOperation {
  if (
    openapiOperation.dryRun !== undefined &&
    typeof openapiOperation.dryRun !== "boolean"
  ) {
    console.error(`\`openapi.dryRun\` must be a boolean.`);
    process.exit(1);
  }

  if (
    openapiOperation.validateSchema !== undefined &&
    typeof openapiOperation.validateSchema !== "boolean"
  ) {
    console.error(`\`openapi.validateSchema\` must be a boolean.`);
    process.exit(1);
  }

  if (
    openapiOperation.preTransform !== undefined &&
    typeof openapiOperation.preTransform !== "function"
  ) {
    console.error(`\`openapi.preTransform\` must be a function.`);
    process.exit(1);
  }
  if (
    openapiOperation.postTransform !== undefined &&
    typeof openapiOperation.postTransform !== "function"
  ) {
    console.error(`\`openapi.postTransform\` must be a function.`);
    process.exit(1);
  }

  const transformation = openapiOperation.transformation;
  if (transformation !== undefined) {
    if (typeof transformation !== "object") {
      console.error(`\`openapi.transformation\` must be an object.`);
      process.exit(1);
    } else {
      validateTransformation(transformation);
    }
  }

  return openapiOperation as OpenApiOperation;
}

function validateTransformation(
  transformation: OpenApiTransformationOperation
) {
  if (
    transformation.cors !== undefined &&
    (typeof transformation.cors !== "function" ||
      transformation.cors.length < 2)
  ) {
    console.error(
      `\`openapi.transformation.cors\` must be a function which accepts two arguments.`
    );
    process.exit(1);
  }

  if (transformation.securitySchemes !== undefined) {
    if (typeof transformation.securitySchemes !== "object") {
      console.error(
        `\`openapi.transformation.securitySchemes\` must be an object.`
      );
      process.exit(1);
    } else {
      validateSecuritySchemes(transformation.securitySchemes);

      if (transformation.apiGatewayIntegration !== undefined) {
        if (typeof transformation.apiGatewayIntegration !== "object") {
          console.error(
            `\`openapi.transformation.apiGatewayIntegration\` must be an object.`
          );
          process.exit(1);
        } else {
          validateApiGatewayIntegration(
            transformation.apiGatewayIntegration,
            transformation.securitySchemes
          );
        }
      }
    }
  }
}

function validateSecuritySchemes(
  securitySchemes: OpenApiTransformationSecuritySchemeOperation
) {
  if (
    securitySchemes.scheme === undefined ||
    typeof securitySchemes.scheme !== "object"
  ) {
    console.error(
      `\`openapi.transformation.securitySchemes.scheme\` is a required property and must be an object.`
    );
    process.exit(1);
  }

  if (Object.keys(securitySchemes.scheme).length === 0) {
    console.error(
      `\`openapi.transformation.securitySchemes.scheme[schemeKey]\` requires at least one security scheme.`
    );
    process.exit(1);
  }

  const invalidSecuritySchemeKeys = Object.keys(securitySchemes.scheme).filter(
    (key) => typeof securitySchemes.scheme[key] !== "object"
  );

  if (invalidSecuritySchemeKeys.length > 0) {
    console.error(
      `\`openapi.transformation.securitySchemes.scheme[schemeKey]\` must be an object.\nInvalid schemeKey: \`${invalidSecuritySchemeKeys.join(
        "`, `"
      )}\``
    );
    process.exit(1);
  }

  if (
    securitySchemes.filterSecurity !== undefined &&
    (typeof securitySchemes.filterSecurity !== "function" ||
      securitySchemes.filterSecurity.length > 3)
  ) {
    console.error(
      `\`openapi.transformation.securitySchemes.filterSecurity\` must be a function which accepts three arguments.`
    );
    process.exit(1);
  }
}

function validateApiGatewayIntegration(
  apiGatewayIntegration: OpenApiTransformationApiGatewayIntegrationOperation,
  securitySchemes: OpenApiTransformationSecuritySchemeOperation
) {
  if (typeof apiGatewayIntegration.proxyBaseUrl !== "string") {
    console.error(
      `\`openapi.transformation.apiGatewayIntegration.proxyBaseUrl\` is a required string.`
    );
    process.exit(1);
  }

  if (
    typeof apiGatewayIntegration.routeIntegration !== "function" ||
    apiGatewayIntegration.routeIntegration.length > 2
  ) {
    console.error(
      `\`openapi.transformation.apiGatewayIntegration.routeIntegration\` is a required function which accepts two arguments.`
    );
    process.exit(1);
  }

  const securitySchemesExtensions =
    apiGatewayIntegration.securitySchemesExtensions;
  if (
    securitySchemesExtensions !== undefined &&
    typeof securitySchemesExtensions !== "object"
  ) {
    console.error(
      `\`openapi.transformation.apiGatewayIntegration.securitySchemesExtensions\` must be an object.`
    );
    process.exit(1);
  }

  if (securitySchemesExtensions !== undefined) {
    const availableSecuritySchemes = Object.keys(securitySchemes.scheme);
    const securitySchemesWithExtensions = Object.keys(
      securitySchemesExtensions
    );

    const extensionsWithNonAvailableSecurity = securitySchemesWithExtensions.filter(
      (securityScheme) => !availableSecuritySchemes.includes(securityScheme)
    );
    if (extensionsWithNonAvailableSecurity.length > 0) {
      const plurialSentence =
        extensionsWithNonAvailableSecurity.length === 1
          ? "is not an available scheme"
          : "are not available schemes";
      console.error(
        `\`openapi.transformation.apiGatewayIntegration.securitySchemesExtensions[scheme]\` must have schemes defined in \`openapi.transformation.securitySchemes[scheme]\`.\n\`${extensionsWithNonAvailableSecurity.join(
          "`, `"
        )}\` ${plurialSentence}.\nAvailable schemes: \`${availableSecuritySchemes.join(
          "`, `"
        )}\`.`
      );
      process.exit(1);
    }
  }

  if (
    apiGatewayIntegration.binaryMediaTypes !== undefined &&
    (!Array.isArray(apiGatewayIntegration.binaryMediaTypes) ||
      apiGatewayIntegration.binaryMediaTypes.some(
        (value) => typeof value !== "string"
      ))
  ) {
    console.error(
      `\`openapi.transformation.apiGatewayIntegration.binaryMediaTypes\` must be an array of strings.`
    );
    process.exit(1);
  }
}
