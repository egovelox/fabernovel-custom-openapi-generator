import path from "path";
import { Document } from "../../core/document";
import { ConfigCodeGenOperation } from "../../core/config";

import { writeTypeFiles } from "./typeSerializer";
import { groupByFirstTag } from "./groupRoutes";
import { writeContracts } from "./contracts/contractsSerializer";
import { writeFastifyRouter } from "./fastifyRouterSerializer";

import parseSupportTypes from "../../utils/parseSupportTypes";
import generateSchemas from "../../utils/generateSchemas";

export async function runCodeGenOperation(
  openapi: Document,
  options: ConfigCodeGenOperation
): Promise<void> {
  const typesPath = path.join(options.output, "types");
  const contractsPath = path.join(options.output, "contracts");
  const routerPath = path.join(contractsPath, "registerFastify.ts");

  const schemas = openapi.document.components?.schemas;
  const schemasDereferenced = openapi.dereferenced.components?.schemas;

  const supportTypes = await parseSupportTypes();

  if (schemas !== undefined && schemasDereferenced !== undefined) {
    const types = generateSchemas(schemas, schemasDereferenced, supportTypes);
    const groupedRoutes = groupByFirstTag(openapi.document.paths);

    if (shouldGenerateTypes(options)) {
      await writeTypeFiles(types, supportTypes, {
        outputFolder: typesPath,
      });
    }

    if (shouldGenerateContracts(options)) {
      await writeContracts(groupedRoutes, types, {
        outputFolder: contractsPath,
        typesFolder: typesPath,
      });
    }

    if (shouldGenerateRouter(options)) {
      writeFastifyRouter(groupedRoutes, {
        types,
        typesFolder: typesPath,
        config: {
          ...options,
          output: routerPath,
        },
      });
    }
  }
}

function shouldGenerateTypes(options: ConfigCodeGenOperation): boolean {
  return (
    options.type === "typings" ||
    options.type === "contracts" ||
    options.type === "fastify"
  );
}

function shouldGenerateContracts(options: ConfigCodeGenOperation): boolean {
  return options.type === "contracts" || options.type === "fastify";
}

function shouldGenerateRouter(options: ConfigCodeGenOperation): boolean {
  return options.type === "fastify";
}
