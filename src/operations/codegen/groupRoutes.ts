import { OpenAPIV3 } from "openapi-types";
type PathsObject = OpenAPIV3.PathsObject;

export type RouteItem = {
  path: string;
  item: OpenAPIV3.PathItemObject;
};
export type GroupedRoutes = {
  [tag: string]: RouteItem[];
};

export function groupByFirstTag(routes: PathsObject): GroupedRoutes {
  return Object.keys(routes).reduce((groupedRoutes, routePattern) => {
    const pathItem = routes[routePattern];
    const maybeOperationObject =
      pathItem?.get ||
      pathItem?.post ||
      pathItem?.put ||
      pathItem?.delete ||
      pathItem?.patch ||
      pathItem?.options ||
      pathItem?.trace ||
      pathItem?.head;
    const tag = maybeOperationObject?.tags?.[0];

    if (tag) {
      const routeItem: RouteItem = { path: routePattern, item: pathItem };
      return {
        ...groupedRoutes,
        [tag]: [...(groupedRoutes[tag] || []), routeItem],
      };
    } else {
      return {
        ...groupedRoutes,
      };
    }
  }, {} as GroupedRoutes);
}
