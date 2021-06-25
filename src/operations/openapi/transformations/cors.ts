import { OpenAPIV3 } from "openapi-types";
import { ConfigOpenApiTransformationCorsOperation } from "../../../core/config/types/internal";
import { Method } from "../../../types/methods";

export function applyCORS(
  document: OpenAPIV3.Document,
  corsUpdaterPerRoute: ConfigOpenApiTransformationCorsOperation
): OpenAPIV3.Document {
  const pathKeys = Object.keys(document.paths);

  pathKeys.map(function addCORSToPath(pathKey) {
    try {
      const currentPathObject = document.paths[pathKey];
      const httpMethods = Object.keys(currentPathObject) as Method[];
      const defaultOptionObject = {
        summary: "CORS",
        description: "",
        parameters: currentPathObject[httpMethods[0]]?.parameters || [],
        responses: {
          "200": {
            description: "ok",
            content: {},
            headers: {
              "Access-Control-Allow-Origin": {
                schema: {
                  type: "string",
                },
              },
              "Access-Control-Allow-Methods": {
                schema: {
                  type: "string",
                },
              },
              "Access-Control-Allow-Headers": {
                schema: {
                  type: "string",
                },
              },
              "Access-Control-Expose-Headers": {
                schema: {
                  type: "string",
                },
              },
            },
          },
        },
      };

      const optionObject = corsUpdaterPerRoute(pathKey, defaultOptionObject);
      if (optionObject !== false) {
        currentPathObject.options = optionObject;
      }
    } catch (e) {
      console.error(`Could not add CORS to route ${pathKey}\n`);
      throw e;
    }
  });
  return document;
}
