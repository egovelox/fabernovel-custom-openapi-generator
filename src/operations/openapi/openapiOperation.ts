import path from "path";
import { checkOrCreateFolder, writeFile } from "../../utils/files";
import { Document } from "../../core/document";

import { Config, ConfigOpenApiOperation } from "../../core/config";

import { applyCORS } from "./transformations/cors";
import { applySecurity } from "./transformations/security";
import { applyApiGatewayIntegration } from "./transformations/apiGatewayIntegration";

export async function runOpenApiOperation(
  openapi: Document,
  options: ConfigOpenApiOperation,
  config: Config
): Promise<void> {
  let document: Document = openapi;

  const preTransformDocument = options.preTransform;
  if (preTransformDocument !== undefined) {
    try {
      document = await document.updateWith((doc) =>
        preTransformDocument(doc, config)
      );
    } catch (e) {
      console.error("[OpenApi Operation] Could not pre-transform document.", e);
      process.exit(1);
    }
  }

  // Transformations
  const transformation = options.transformation;
  if (transformation !== undefined) {
    const corsUpdaterPerRoute = transformation.cors;
    if (corsUpdaterPerRoute !== undefined) {
      document = await document.updateWith((doc) =>
        applyCORS(doc, corsUpdaterPerRoute)
      );
    }

    const securitySchemes = transformation.securitySchemes;
    if (securitySchemes !== undefined) {
      document = await document.updateWith((doc) =>
        applySecurity(doc, securitySchemes)
      );
    }

    const apiGatewayIntegration = transformation.apiGatewayIntegration;
    if (apiGatewayIntegration !== undefined) {
      document = await document.updateWith((doc) =>
        applyApiGatewayIntegration(doc, apiGatewayIntegration)
      );
    }
  }

  const postTransformDocument = options.postTransform;
  if (postTransformDocument !== undefined) {
    try {
      document = await document.updateWith((doc) =>
        postTransformDocument(doc, config)
      );
    } catch (e) {
      console.error(
        "[OpenApi Operation] Could not post-transform document.",
        e
      );
      process.exit(1);
    }
  }

  if (options.validateSchema) {
    try {
      await document.validate();
    } catch (e) {
      console.error(
        "Generated OpenAPI file does not follow the specification:"
      );
      console.error(e.message);
      process.exit(1);
    }
  }

  if (!options.dryRun) {
    if (options.output !== undefined) {
      try {
        checkOrCreateFolder(path.dirname(options.output), true);
        await writeFile(
          options.output,
          JSON.stringify(document.document, null, 2)
        );
        console.info(`Successfully written file at ${options.output}`);
      } catch (e) {
        console.error(`Could not save file ${options.output}\n`);
        throw e;
      }
    } else {
      console.error(
        "`openapi.output` is not defined, api gateway generation aborted"
      );
    }
  } else {
    console.info("Generated openapi is a success but was not saved (dry run).");
  }
}
