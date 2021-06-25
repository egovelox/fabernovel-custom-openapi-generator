import { OpenAPIV3 } from "openapi-types";
import { RequiredReferenceMap } from "./generateSchemas";

export function isRef<T extends object>(
  requestBody: OpenAPIV3.ReferenceObject | T
): requestBody is OpenAPIV3.ReferenceObject {
  return requestBody.hasOwnProperty("$ref");
}

export function isParameterObject(
  obj: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject
): obj is OpenAPIV3.ParameterObject {
  return !isRef(obj);
}

export function isArraySchemaObject(
  schema: OpenAPIV3.SchemaObject
): schema is OpenAPIV3.ArraySchemaObject {
  return schema.type == "array";
}

export function getHandlerName(
  operationObject: OpenAPIV3.OperationObject
): string {
  if (operationObject.operationId !== undefined) {
    return operationObject.operationId;
  } else {
    throw new Error(
      "An operationId is required in OperationObject to generate contracts and router"
    );
  }
}

export function getJsonSchema(
  obj:
    | OpenAPIV3.ReferenceObject
    | OpenAPIV3.RequestBodyObject
    | OpenAPIV3.ResponseObject
    | undefined
): string | undefined {
  if (obj === undefined) {
    return undefined;
  } else if (isRef(obj)) {
    return obj.$ref;
  } else {
    return getJsonSchemaUriFromMediaType(obj.content?.["application/json"]);
  }
}

export function getJsonSchemaUriFromMediaType(
  mediaType: OpenAPIV3.MediaTypeObject | undefined
): string | undefined {
  if (
    mediaType !== undefined &&
    mediaType.schema !== undefined &&
    isRef(mediaType.schema)
  ) {
    return mediaType.schema.$ref;
  } else {
    return undefined;
  }
}

export function getSchemaRef(
  schemaUri: string | undefined,
  types: RequiredReferenceMap
): string | undefined {
  return schemaUri ? types[schemaUri]?.name : undefined;
}
