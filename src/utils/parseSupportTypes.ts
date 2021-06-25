import fs from "fs";
import path from "path";

export type TypeRessource = {
  type: "provided" | "custom";
  export_name: string;
  system_path: string;
};

export type TypeRessources = {
  [name: string]: TypeRessource;
};

const providedTypingsFolder = path.resolve(
  __dirname,
  "../../static/type-utils"
);

export default async function parseSupportTypes(): Promise<TypeRessources> {
  const typeRessources = await getProvidedTypes();

  // TODO : allow custom types

  return typeRessources;
}

type TypesFileSchema = {
  export: string;
};
async function getProvidedTypes() {
  try {
    const typeDefinitions: {
      [filename: string]: TypesFileSchema;
    } = require(path.resolve(providedTypingsFolder, "types.json"));

    return await Object.keys(typeDefinitions).reduce(
      async (typeRessources, filename) => {
        const accumulator = await typeRessources;

        const filepath = path.resolve(providedTypingsFolder, `${filename}.ts`);
        const ressource = await checkFileAndReturnRessource(
          "provided",
          filepath,
          typeDefinitions[filename]
        );

        if (ressource !== undefined) {
          return Promise.resolve({
            ...accumulator,
            [filename]: ressource,
          });
        } else {
          console.warn(
            `Type ${filename} could not be loaded.
              File does not exist: ${filepath}`
          );
          return Promise.resolve(accumulator);
        }
      },
      Promise.resolve({} as TypeRessources)
    );
  } catch (e) {
    console.error(`getProvidedTypes, error ${e}`);
    return {};
  }
}

async function checkFileAndReturnRessource(
  type: "provided" | "custom",
  filepath: string,
  typeSchema: TypesFileSchema
): Promise<TypeRessource | undefined> {
  try {
    await fs.promises.access(filepath);
    return {
      type,
      export_name: typeSchema.export,
      system_path: filepath,
    };
  } catch (err) {
    return undefined;
  }
}
