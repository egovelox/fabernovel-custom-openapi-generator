import { loadCompleteConfig } from "./core/config";
import { findProjectRoot } from "./core/project";
import { loadDocument } from "./core/document/loadDocument";
import { runCodeGenOperation } from "./operations/codegen";
import { runOpenApiOperation } from "./operations/openapi";

export async function run(): Promise<void> {
  const projectRoot = await findProjectRoot();
  const config = await loadCompleteConfig(projectRoot);

  const document = await loadDocument(config);

  if (config.operations.codegen !== undefined) {
    console.info("Codegen >");
    await runCodeGenOperation(document, config.operations.codegen);
    console.log("");
  }
  if (config.operations.openapi !== undefined) {
    console.info("Openapi >");
    await runOpenApiOperation(document, config.operations.openapi, config);
  }
}
