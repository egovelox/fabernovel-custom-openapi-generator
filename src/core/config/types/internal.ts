import { OpenAPIV3 } from "openapi-types";
import { Method } from "../../../types/methods";

export type CLIConfig = Partial<{
  name: string;
  version: string;
  mode: string;
}>;

export type BaseConfig = {
  name: string;
  version: string;
  mode?: string;
};
export type PartialBaseConfig = Omit<BaseConfig, "version"> &
  Partial<Pick<BaseConfig, "version">>;

export type Config = {
  name: string;
  version: string;
  mode?: string;
  input: string;
  normalizeInput?: (
    input: OpenAPIV3.Document,
    config: Config
  ) => OpenAPIV3.Document;
  operations: {
    openapi?: ConfigOpenApiOperation;
    codegen?: ConfigCodeGenOperation;
  };
};

export type ConfigOpenApiOperation = {
  output: string;
  dryRun: boolean;
  validateSchema: boolean;
  preTransform?: ConfigOpenApiTransformOperation;
  postTransform?: ConfigOpenApiTransformOperation;
  transformation?: {
    cors?: ConfigOpenApiTransformationCorsOperation;
    securitySchemes?: ConfigOpenApiTransformationSecuritySchemesOperation;
    apiGatewayIntegration?: ConfigOpenApiTransformationApiGatewayIntegration;
  };
};

export type ConfigOpenApiTransformOperation = (
  input: OpenAPIV3.Document,
  config: Config
) => OpenAPIV3.Document;

export type ConfigOpenApiTransformationCorsOperation = (
  path: string,
  cors: object
) => object | false;

export type ConfigOpenApiTransformationSecuritySchemesOperation = {
  scheme: Record<string, object>;
  filterSecurity?: (
    path: string,
    method: Method,
    security: Array<Record<string, string[]>>
  ) => Array<Record<string, string[]>> | false;
};

export type ConfigOpenApiTransformationApiGatewayIntegration = {
  proxyBaseUrl: string;
  routeIntegration: (
    route: { path: string; method: Method },
    extension: object
  ) => object;
  securitySchemesExtensions?: {
    [securityName: string]: object;
  };
  binaryMediaTypes?: string[];
};

export type ConfigCodeGenOperation =
  | {
      output: string;
      type: "typings" | "contracts";
    }
  | ConfigCodeGenOperationFastify;

type ConfigCodeGenOperationFastify = {
  output: string;
  type: "fastify";
  iotsRouter: boolean;
  noSchemas: boolean;
};
