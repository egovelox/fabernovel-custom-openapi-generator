import { OpenAPIV3 } from "openapi-types";
import { Method } from "../../../types/methods";
import { Config } from "./internal";

export type LibraryConfigObject = {
  input: string;
  normalizeInput?: (
    input: OpenAPIV3.Document,
    config: Config
  ) => OpenAPIV3.Document;
  operations: Operations;
};

export type Operations = {
  openapi?: OpenApiOperation;
  codegen?: CodeGenOperation;
};
export type OperationsKeys = keyof Operations;
export type OperationsValues = Operations[OperationsKeys];

type SharedOperation = {
  output: string;
};

export type OpenApiOperation = SharedOperation & {
  dryRun?: boolean;
  validateSchema?: boolean;
  transformation?: OpenApiTransformationOperation;

  preTransform?: (
    input: OpenAPIV3.Document,
    config: Config
  ) => OpenAPIV3.Document;
  postTransform?: (
    input: OpenAPIV3.Document,
    config: Config
  ) => OpenAPIV3.Document;
};

export type OpenApiTransformationOperation = {
  cors?: (path: string, cors: object) => object | false;
  securitySchemes?: OpenApiTransformationSecuritySchemeOperation;
  apiGatewayIntegration?: OpenApiTransformationApiGatewayIntegrationOperation;
};

export type OpenApiTransformationSecuritySchemeOperation = {
  scheme: Record<string, object>;
  filterSecurity?: (
    path: string,
    method: Method,
    security: Array<Record<string, string[]>>
  ) => Array<Record<string, string[]>> | false;
};

export type OpenApiTransformationApiGatewayIntegrationOperation = {
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

export type CodeGenOperation = SharedOperation & {
  output: string;

  type: CodeGenType | CodeGenFastifyOperationArray;
};
export type CodeGenType = "typings" | "contracts" | "fastify";
export type CodeGenFastifyOperationArray = [
  "fastify",
  { iotsRouter?: boolean; noSchemas?: boolean }
];

type LibraryConfigFn<T> = (options?: { mode?: string }) => T;

export type LibraryConfig =
  | LibraryConfigObject
  | LibraryConfigFn<LibraryConfigObject>;

export type PartialLibraryConfig =
  | Partial<LibraryConfigObject>
  | LibraryConfigFn<Partial<LibraryConfigObject>>;
