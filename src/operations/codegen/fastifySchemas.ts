import { OpenAPIV3 } from "openapi-types";

import { ConfigCodeGenOperation } from "../../core/config";

import { RequiredReferenceMap } from "../../utils/generateSchemas";
import {
  getSchemaRef,
  getJsonSchema,
  isParameterObject,
} from "../../utils/openapi";
import { isDefined } from "../../utils/objects";

export default function makeJsonSchemaParameter(
  operation: OpenAPIV3.OperationObject,
  types: RequiredReferenceMap,
  config: ConfigCodeGenOperation
): string {
  if (config.type === "fastify" && !config.noSchemas) {
    const paramsTypes = makeJsonSchemaParams(operation);
    const queryTypes = makeJsonSchemaQuery(operation);
    const bodyType = makeJsonSchemaBody(operation, types);
    const responseTypes = makeJsonSchemaResponses(operation, types);

    const schemaParts = [
      paramsTypes,
      queryTypes,
      bodyType,
      responseTypes,
    ].filter(isDefined);

    if (schemaParts.length > 0) {
      return ` {schema: {${schemaParts.join(",")}}},`;
    } else {
      return "";
    }
  } else {
    return "";
  }
}

function makeJsonSchemaBody(
  operation: OpenAPIV3.OperationObject,
  types: RequiredReferenceMap
): string | undefined {
  const requestBodyType = getSchemaRef(
    getJsonSchema(operation.requestBody),
    types
  );
  if (requestBodyType !== undefined) {
    return `body: ${requestBodyType}Schema`;
  } else {
    return undefined;
  }
}

function makeJsonSchemaResponses(
  operation: OpenAPIV3.OperationObject,
  types: RequiredReferenceMap
): string | undefined {
  const responses: string[] = [];
  Object.keys(operation.responses || {}).forEach((status) => {
    const ref = getSchemaRef(
      getJsonSchema(operation.responses?.[status]),
      types
    );
    if (ref !== undefined) {
      responses.push(`${status}: ${ref}Schema`);
    }
  });
  if (responses.length > 0) {
    return `response: {${responses.join(", ")}}`;
  } else {
    return undefined;
  }
}

function makeJsonSchemaParams(
  operation: OpenAPIV3.OperationObject
): string | undefined {
  if (operation.parameters !== undefined) {
    const pathParameters = operation.parameters
      .filter(isParameterObject)
      .filter((parameter) => parameter.in === "path");
    if (pathParameters.length > 0) {
      const schema = buildJsonObjectFromParameter(pathParameters);
      return `params: ${JSON.stringify(schema)}`;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
}

function buildJsonObjectFromParameter(
  parameters: OpenAPIV3.ParameterObject[]
): OpenAPIV3.SchemaObject {
  const jsonSchemaObject: OpenAPIV3.SchemaObject = {
    type: "object",
    properties: {},
    required: parameters.filter((p) => p.required).map((p) => p.name),
  };
  parameters.forEach((parameter) => {
    if (
      jsonSchemaObject.properties !== undefined &&
      parameter.schema !== undefined
    ) {
      jsonSchemaObject.properties[parameter.name] = parameter.schema;
    }
  });
  return jsonSchemaObject;
}

function makeJsonSchemaQuery(
  operation: OpenAPIV3.OperationObject
): string | undefined {
  if (operation.parameters !== undefined) {
    const queryParameters = operation.parameters
      .filter(isParameterObject)
      .filter((parameter) => parameter.in === "query");
    if (queryParameters.length > 0) {
      const schema = buildJsonObjectFromParameter(queryParameters);
      const refSchemaRegex = /{\"\$ref\":\"#\/components\/schemas\/(?<ref>\w+)\"}/g;
      const schemaStrRefs = JSON.stringify(schema).replace(
        refSchemaRegex,
        "$1Schema"
      );
      return `querystring: ${schemaStrRefs}`;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
}
