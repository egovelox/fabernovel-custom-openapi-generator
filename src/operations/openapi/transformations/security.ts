import { OpenAPIV3 } from "openapi-types";
import { ConfigOpenApiTransformationSecuritySchemesOperation } from "../../../core/config/types/internal";
import { Method } from "../../../types/methods";

export function applySecurity(
  document: OpenAPIV3.Document,
  securitySchemesOptions: ConfigOpenApiTransformationSecuritySchemesOperation
): OpenAPIV3.Document {
  if (document.components === undefined) {
    console.error(
      "OpenApi document does not have a `components` object. Please add it to your file."
    );
    process.exit(1);
  } else {
    if (document.components.securitySchemes === undefined) {
      // We ignore the typing of securitySchemesOptions.scheme as we do not validate it.
      // TODO maybe validate the schema in the config
      // @ts-ignore
      document.components.securitySchemes = securitySchemesOptions.scheme;
    } else {
      console.info(
        "`securitySchemes` already defined. Skipping securitySchemes assignation."
      );
    }

    const defaultRouteSecurityList = Object.keys(
      // document.components are guarenteed to be defined from the statement above
      // @ts-ignore
      document.components.securitySchemes
    ).map((security) => ({ [security]: [] }));

    const pathKeys = Object.keys(document.paths);
    pathKeys.map(function addSecurityToPath(pathKey) {
      try {
        const currentPathObject = document.paths[pathKey];
        const httpMethods = Object.keys(currentPathObject) as Method[];

        httpMethods.map((method) => {
          if (method.toLowerCase() !== "options") {
            const userSecurityObject = securitySchemesOptions.filterSecurity?.(
              pathKey,
              method,
              defaultRouteSecurityList
            );

            // False mean no security.
            // Object means custom security.
            // undefined means defaultSecurity
            if (userSecurityObject !== false) {
              (currentPathObject[method] || {}).security =
                userSecurityObject || defaultRouteSecurityList;
            }
          }
        });
      } catch (e) {
        console.error(`Could not add \`security\` to route ${pathKey}\n`);
        throw e;
      }
    });
  }

  return document;
}
