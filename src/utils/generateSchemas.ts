import * as t from "io-ts-codegen";
import { OpenAPIV3 } from "openapi-types";
import { to } from "./jsonParser";
import { TypeRessources } from "./parseSupportTypes";

type JSONSchema = OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;
type SchemasReferenceType = {
  [key: string]: JSONSchema;
};

export type Dependency = { ref: string; name: string; utilitary: boolean };
export type ReferenceItem = {
  name: string;
  ref: string;
  type?: t.TypeReference;
  dependencies: Dependency[];
  schema: JSONSchema;
};

export type RequiredReferenceItem = Required<ReferenceItem>;

export type ReferenceMap = {
  [ref: string]: ReferenceItem;
};
export type RequiredReferenceMap = {
  [ref: string]: RequiredReferenceItem;
};

function buildReferenceMap(
  schemas: SchemasReferenceType,
  schemasDereferenced: SchemasReferenceType
) {
  const referenceMap: ReferenceMap = {};

  Object.keys(schemas).forEach((name) => {
    const ref = `#/components/schemas/${name}`;
    referenceMap[ref] = {
      name,
      ref,
      type: undefined,
      dependencies: [],
      schema: schemasDereferenced[name],
    };
  });

  return referenceMap;
}

export type addDependencyFn = (
  typeName: string,
  ref: string,
  utilitary?: boolean
) => void;

export default function generateSchemas(
  schemas: SchemasReferenceType,
  schemasDereferenced: SchemasReferenceType,
  supportTypes: TypeRessources
): RequiredReferenceMap {
  let referenceMap = buildReferenceMap(schemas, schemasDereferenced);

  const keys = Object.keys(referenceMap);
  const newRefMap = keys.reduce<RequiredReferenceMap>((refMap, key) => {
    const item = referenceMap[key];
    const dependencies = item.dependencies;
    const addDependency: addDependencyFn = (
      typeName,
      ref,
      utilitary = false
    ) => {
      if (!dependencies.find((dep) => dep.name === typeName)) {
        dependencies.push({ name: typeName, ref, utilitary });
      }
    };

    return {
      ...refMap,
      [key]: {
        ...item,
        type: to(
          item.ref,
          schemas[item.name],
          referenceMap,
          addDependency,
          supportTypes
        ),
        dependencies,
      },
    };
  }, {});

  return newRefMap;
}
