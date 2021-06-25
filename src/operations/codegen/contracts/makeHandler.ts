import { OpenAPIV3 } from "openapi-types";
import { printStatic } from "io-ts-codegen";

import { toNoRef } from "../../../utils/jsonParser";
import { capitalize } from "../../../utils/strings";
import { isArraySchemaObject, isRef } from "../../../utils/openapi";
import { removeUndefinedValues } from "../../../utils/array";
import { addTypeImportFn } from "./types";
import { ReferenceMap } from "../../../utils/generateSchemas";

type ParameterMap = {
  [paramType: string]: OpenAPIV3.SchemaObject;
};
const emptyParameter: OpenAPIV3.SchemaObject = {
  type: "object",
  required: [],
  properties: {},
};

type ArgumentsFastifyType =
  | "Body"
  | "Querystring"
  | "Params"
  | "Headers"
  | "Reply";

type HandlerArgumentsMap = {
  type: ArgumentsFastifyType;
  name: string;
  statementDefinition: string | undefined;
};

export function makeHandler(
  name: string,
  operationObject: OpenAPIV3.OperationObject,
  addTypeImport: addTypeImportFn,
  referenceMap: ReferenceMap
): string {
  const handlerName = capitalize(name);
  let fileStatements: string[] = [];
  const parameters = openapiParametersToJsonSchema(operationObject);
  const bodyType = parseBody(name, operationObject, addTypeImport);
  const paramsTypes = parseParamsReference(
    operationObject,
    referenceMap,
    addTypeImport
  );
  const handlerArgumentTypes = makeHandlerArgumentTypes(
    handlerName,
    parameters,
    bodyType,
    paramsTypes || {}
  );

  if (handlerArgumentTypes.length > 0) {
    fileStatements = [
      ...fileStatements,
      ...removeUndefinedValues(
        handlerArgumentTypes.map(
          (handlerArgumentType) => handlerArgumentType.statementDefinition
        )
      ),
    ];
    const handlerGenericType = makeHandlerGenericType(
      handlerName,
      handlerArgumentTypes
    );
    fileStatements.push(handlerGenericType.statementDefinition);

    fileStatements.push(`export type ${handlerName}<S extends RawServerBase = http.Server> = RouteHandlerMethod<
  S,
  RawRequestDefaultExpression<S>,
  RawReplyDefaultExpression<S>,
  Required<RouteGenericInterface> & ${handlerGenericType.name}
>;`);
  } else {
    fileStatements.push(`export type ${handlerName}<S extends RawServerBase = http.Server> = RouteHandlerMethod<
  S,
  RawRequestDefaultExpression<S>,
  RawReplyDefaultExpression<S>,
  Required<RouteGenericInterface>
>;`);
  }

  return fileStatements.join("\n");
}

const isParameterObject = (
  param: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject
): param is OpenAPIV3.ParameterObject => param.hasOwnProperty("in");

function getArgumentFastifyNameFromOpenApiParameterType(
  parameterType: string
): ArgumentsFastifyType {
  switch (parameterType.toLowerCase()) {
    case "body": {
      return "Body";
    }
    case "query": {
      return "Querystring";
    }
    case "path": {
      return "Params";
    }
    case "headers": {
      return "Headers";
    }
    default:
      throw new Error(`Unknow parameterType: ${parameterType}`);
  }
}

function makeHandlerArgumentTypes(
  handlerName: string,
  parameters: ParameterMap = {},
  bodyType: BodyTypeObject | undefined,
  referenceMap: ReferenceMap
): HandlerArgumentsMap[] {
  const argumentsFromParameters = Object.keys(parameters).map(
    function makeArgument(parameterType) {
      const parameterObject = parameters[parameterType];
      const importName = `${handlerName}_${parameterType}`;
      const statementDefinition = `export type ${importName} = ${printStatic(
        toNoRef(parameterObject, referenceMap)
      )}`;

      return {
        type: getArgumentFastifyNameFromOpenApiParameterType(parameterType),
        name: importName,
        statementDefinition,
      };
    }
  );

  if (bodyType === undefined) {
    return argumentsFromParameters;
  } else if (bodyType.type === "local") {
    return [
      ...argumentsFromParameters,
      {
        type: "Body",
        name: `${handlerName}_body`,
        statementDefinition: `export type ${handlerName}_body = ${bodyType.value}`,
      },
    ];
  } else if (bodyType.type === "import") {
    return [
      ...argumentsFromParameters,
      {
        type: "Body",
        name: bodyType.value,
        statementDefinition: undefined,
      },
    ];
  } else {
    throw new Error(`Could not make handler arguments for ${handlerName}`);
  }
}

function makeHandlerGenericType(
  handlerName: string,
  handlerArgumentTypes: HandlerArgumentsMap[]
): { name: string; statementDefinition: string } {
  const definition = `{
  ${handlerArgumentTypes
    .map(
      (handlerArgumentType) =>
        `${handlerArgumentType.type}: ${handlerArgumentType.name}`
    )
    .join(",\n  ")}
}`;

  return {
    name: `${handlerName}_generic`,
    statementDefinition: `export type ${handlerName}_generic = ${definition}`,
  };
}

function openapiParametersToJsonSchema(
  operationObject: OpenAPIV3.OperationObject
) {
  return operationObject.parameters?.reduce((parameterMap, param) => {
    if (isParameterObject(param)) {
      const parameterFromType = parameterMap[param.in] || emptyParameter;
      const required = param.required
        ? [...parameterFromType.required!, param.name]
        : parameterFromType.required;
      const prop =
        param.schema !== undefined ? { [param.name]: param.schema } : {};

      const p: OpenAPIV3.SchemaObject = {
        ...parameterFromType,
        properties: {
          ...parameterFromType.properties,
          ...prop,
        },
        required,
      };

      const newParamMap: ParameterMap = {
        ...parameterMap,
        [param.in]: p,
      };
      return newParamMap;
    } else {
      console.error(
        `${operationObject?.operationId} > Parameter ref ${param.$ref} not yet supported in handler definition`
      );
      return parameterMap;
    }
  }, {} as ParameterMap);
}

type BodyTypeObject = { type: "import" | "local"; value: string };
function parseBody(
  handlerName: string,
  operationObject: OpenAPIV3.OperationObject,
  addTypeImport: addTypeImportFn
): BodyTypeObject | undefined {
  const requestBody = operationObject.requestBody;
  if (requestBody === undefined || isRef(requestBody)) {
    if (requestBody !== undefined) {
      console.warn(
        `${handlerName} handler body > ref is only supported on 'application/json' type. Typed with any.`
      );
    }
    return undefined;
  } else {
    const optionalType = requestBody.required === true ? "" : " | undefined";

    const supportedContentType = "application/json";
    const bodyMediaTypeObject = requestBody.content[supportedContentType];
    const jsonSchema = bodyMediaTypeObject?.schema;

    if (bodyMediaTypeObject !== undefined && jsonSchema !== undefined) {
      if (isRef(jsonSchema)) {
        const value = addTypeImport(jsonSchema.$ref);
        if (value !== undefined) {
          return {
            type: "import",
            value,
          };
        } else {
          return undefined;
        }
      } else {
        return {
          type: "local",
          value: `${printStatic(toNoRef(jsonSchema))}${optionalType}`,
        };
      }
    } else {
      console.warn(
        `${handlerName} handler body > only 'application/json' type is supported. Typed with any.`
      );
      return undefined;
    }
  }
}

function parseParamsReference(
  operationObject: OpenAPIV3.OperationObject,
  referenceMap: ReferenceMap,
  addTypeImport: addTypeImportFn
): ReferenceMap | undefined {
  const { parameters } = operationObject;

  const refs = parameters
    ?.reduce((refObjects: OpenAPIV3.ReferenceObject[], object) => {
      if (isRef(object)) {
        refObjects.push(object);
      } else if (isParameterObject(object) && object.schema !== undefined) {
        if (isRef(object.schema)) {
          refObjects.push(object.schema);
        } else if (
          isArraySchemaObject(object.schema) &&
          isRef(object.schema.items)
        ) {
          refObjects.push(object.schema.items);
        }
      }
      return refObjects;
    }, [])
    .map((refObjects) => refObjects.$ref);

  refs?.forEach((ref) => {
    addTypeImport(ref);
  });

  return Object.fromEntries(
    Object.entries(referenceMap).filter(([ref]) => refs?.includes(ref))
  );
}
