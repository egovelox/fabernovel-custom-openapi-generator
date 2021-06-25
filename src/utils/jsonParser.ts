import * as t from "io-ts-codegen";
import { OpenAPIV3 } from "openapi-types";
import { ReferenceMap, addDependencyFn } from "./generateSchemas";
import { TypeRessources } from "./parseSupportTypes";

export type JSONSchema = OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;
type SchemaReference = OpenAPIV3.ReferenceObject;
type ArraySchema = OpenAPIV3.ArraySchemaObject;
type NonArraySchemaObject = OpenAPIV3.NonArraySchemaObject;

function handleStringType(
  ref: string,
  schema: NonArraySchemaObject,
  addDependency: addDependencyFn,
  supportTypes: TypeRessources
) {
  const enumValues = schema?.enum;
  if (enumValues !== undefined) {
    return t.keyofCombinator(enumValues);
  } else {
    const format = schema?.format;
    if (format === undefined) {
      return t.stringType;
    } else {
      const supportType = supportTypes[format];

      if (supportType === undefined) {
        console.warn(`${ref} > Format '${format}' is not supported.`);
        return t.stringType;
      } else {
        addDependency(format, "#", true);
        return t.identifier(supportType.export_name);
      }
    }
  }
}

function getRequiredProperties(
  schema: NonArraySchemaObject
): { [key: string]: true } {
  const required: { [key: string]: true } = {};
  if (schema.required) {
    schema.required.forEach((k) => {
      required[k] = true;
    });
  }
  return required;
}

function toInterfaceCombinator(
  ref: string,
  schema: NonArraySchemaObject,
  referenceMap: ReferenceMap,
  addDependencies: addDependencyFn,
  supportTypes: TypeRessources
): t.InterfaceCombinator {
  const required = getRequiredProperties(schema);
  const properties = schema?.properties || {};
  return t.interfaceCombinator(
    Object.keys(properties).map(
      (key) =>
        t.property(
          key,
          to(key, properties[key], referenceMap, addDependencies, supportTypes),
          !required.hasOwnProperty(key)
        ),
      ref
    )
  );
}

function toArrayCombinator(
  ref: string,
  schema: ArraySchema,
  referenceMap: ReferenceMap,
  addDependencies: addDependencyFn,
  supportTypes: TypeRessources
): t.ArrayCombinator {
  return t.arrayCombinator(
    to(ref, schema.items, referenceMap, addDependencies, supportTypes)
  );
}

const isReference = (schema: JSONSchema): schema is SchemaReference =>
  schema.hasOwnProperty("$ref");

export function to(
  ref: string,
  schema: JSONSchema,
  referenceMap: Readonly<ReferenceMap>,
  addDependency: addDependencyFn,
  supportTypes: TypeRessources
): t.TypeReference {
  if (isReference(schema)) {
    const referenceTypeName = referenceMap[schema.$ref]?.name;
    if (referenceTypeName !== undefined) {
      addDependency(referenceTypeName, schema.$ref);
      return t.identifier(referenceTypeName);
    }
    throw new Error(
      `Reference not found: ${referenceTypeName} // ${schema.$ref}`
    );
  }

  // Contrary to what the typings says, type CAN be undefined for combinators
  // We do not handle the case where `type` is factored in the root object
  if ((schema.type as string | undefined) === undefined) {
    return toCombinator(ref, schema, referenceMap, addDependency, supportTypes);
  }

  switch (schema.type) {
    case "null":
      return t.nullType;
    case "string":
      return handleStringType(ref, schema, addDependency, supportTypes);
    case "number":
      return t.numberType;
    case "integer":
      return t.intType;
    case "boolean":
      return t.booleanType;
    case "array":
      return toArrayCombinator(
        ref,
        schema,
        referenceMap,
        addDependency,
        supportTypes
      );
    case "object":
      return toInterfaceCombinator(
        ref,
        schema,
        referenceMap,
        addDependency,
        supportTypes
      );
    default:
      throw new Error(`JSON type must have a type property.
'${JSON.stringify(schema, null, 2)}' has no type property.`);
  }
}

function toCombinator(
  ref: string,
  schema: OpenAPIV3.SchemaObject,
  referenceMap: Readonly<ReferenceMap>,
  addDependency: addDependencyFn,
  supportTypes: TypeRessources
) {
  if (schema.oneOf !== undefined) {
    console.warn(
      "'oneOf' normally means that one and only one type matches which is not strictly possible in io-ts."
    );
    console.warn(
      "Consider using 'anyOf' and make the types enforce that there is only one match possible."
    );
    return t.unionCombinator(
      schema.oneOf.map((s) =>
        to(ref, s, referenceMap, addDependency, supportTypes)
      )
    );
  } else if (schema.allOf !== undefined) {
    return t.intersectionCombinator(
      schema.allOf.map((s) =>
        to(ref, s, referenceMap, addDependency, supportTypes)
      )
    );
  } else if (schema.anyOf !== undefined) {
    return t.unionCombinator(
      schema.anyOf.map((s) =>
        to(ref, s, referenceMap, addDependency, supportTypes)
      )
    );
  } else {
    console.error("Unhandled schema combinator : ");
    console.error(schema);
    throw Error("Unhandled schema combinator");
  }
}

export function toNoRef(
  schema: JSONSchema,
  referenceMap: ReferenceMap = {}
): t.TypeReference {
  if (isReference(schema)) {
    throw new Error(
      "[toNoRef] Ref not supported. Please use a deserialized object."
    );
  }

  const addDependency = () => {};

  // Contrary to what the typings says, type CAN be undefined for combinators
  // We do not handle the case where `type` is factored in the root object
  if ((schema.type as string | undefined) === undefined) {
    return toCombinatorNoRef(schema, referenceMap);
  }

  if (schema.oneOf) {
    return t.unionCombinator(
      schema.oneOf.map((schema) => toNoRef(schema, referenceMap))
    );
  } else if (schema.allOf) {
    return t.intersectionCombinator(
      schema.allOf.map((schema) => toNoRef(schema, referenceMap))
    );
  } else if (schema.anyOf) {
    return t.unionCombinator(
      schema.anyOf.map((schema) => toNoRef(schema, referenceMap))
    );
  }

  switch (schema.type) {
    case "null":
      return t.nullType;
    case "string":
      return handleStringType("toNoRef", schema, addDependency, {});
    case "number":
      return t.numberType;
    case "integer":
      return t.intType;
    case "boolean":
      return t.booleanType;
    case "array":
      return toArrayCombinator(
        "toNoRef",
        schema,
        referenceMap,
        addDependency,
        {}
      );
    case "object":
      return toInterfaceCombinator(
        "toNoRef",
        schema,
        referenceMap,
        addDependency,
        {}
      );
  }
}

function toCombinatorNoRef(
  schema: OpenAPIV3.SchemaObject,
  referenceMap: ReferenceMap
) {
  if (schema.oneOf) {
    return t.unionCombinator(
      schema.oneOf.map((schema) => toNoRef(schema, referenceMap))
    );
  } else if (schema.allOf) {
    return t.intersectionCombinator(
      schema.allOf.map((schema) => toNoRef(schema, referenceMap))
    );
  } else if (schema.anyOf) {
    return t.unionCombinator(
      schema.anyOf.map((schema) => toNoRef(schema, referenceMap))
    );
  } else {
    console.error("Unhandled schema combinator : ");
    console.error(schema);
    throw Error("Unhandled schema combinator");
  }
}
