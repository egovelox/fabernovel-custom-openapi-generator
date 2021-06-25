import path from "path";
import { promises as fs } from "fs";
import minimist from "minimist";
import { cosmiconfig } from "cosmiconfig";

import {
  BaseConfig,
  PartialBaseConfig,
  CLIConfig,
  Config,
} from "./types/internal";

import {
  PartialLibraryConfig,
  LibraryConfigObject,
  Operations,
  OperationsKeys,
  OperationsValues,
  CodeGenOperation,
  CodeGenFastifyOperationArray,
  CodeGenType,
} from "./types/public";

import { validateOpenApiOperation } from "./validation/openapiOperationValidation";

import { tryOrFail } from "../../utils/log";
import { fileExists, fileExistsException } from "../../utils/files";
import { semverPattern } from "./semver";
import { isArray } from "../../utils/array";
import { PropType, DeepPartial } from "../../utils/objects";

const LIB_NAME = "openapi-generator";

export async function loadCompleteConfig(
  projectDirectory: string
): Promise<Config> {
  const cliConfig = loadCliConfig();
  const projectConfig = await loadProjectConfig(projectDirectory);
  const { partialLibraryConfig, configPath } = await loadLibrairyConfig(
    projectDirectory
  );
  const generatedPartialLibraryConfig =
    typeof partialLibraryConfig === "function"
      ? partialLibraryConfig({ mode: cliConfig.mode })
      : partialLibraryConfig;
  const libraryConfig = await validateLibraryConfig(
    generatedPartialLibraryConfig,
    configPath
  );

  const config = makeConfig(cliConfig, projectConfig, libraryConfig);

  return config;
}

function loadCliConfig(): CLIConfig {
  const args = minimist(process.argv);

  return {
    name: args.name,
    version: args.version,
    mode: args.mode,
  };
}

async function loadProjectConfig(
  projectDirectory: string
): Promise<PartialBaseConfig> {
  const packageJsonPath = path.resolve(projectDirectory, "package.json");

  await tryOrFail(
    () => fileExistsException(packageJsonPath),
    `Could not find the project's package.json. (path: ${packageJsonPath})`
  );

  const file = await tryOrFail(
    () => fs.readFile(packageJsonPath),
    `Could not read the project's package.json. (path: ${packageJsonPath})`
  );
  const packageJson: Record<string, unknown> = await tryOrFail(
    () => JSON.parse(file.toString()),
    `Could not parse the project's package.json. Is it valid json? (path: ${packageJsonPath})`
  );

  const partialBaseConfig: Partial<BaseConfig> = {};

  if (typeof packageJson.name === "string" && packageJson.name.length > 0) {
    partialBaseConfig.name = packageJson.name;
  } else {
    console.error(
      "The project does not have a name. Is `name` set in package.json?"
    );
    process.exit(1);
  }

  if (
    typeof packageJson.version === "string" &&
    packageJson.version.length > 0
  ) {
    if (semverPattern.test(packageJson.version)) {
      partialBaseConfig.version = packageJson.version;
    } else {
      console.error(
        `The package.json \`version\` is not valid. Got: ${packageJson.version}`
      );
      process.exit(1);
    }
  }

  return partialBaseConfig as PartialBaseConfig;
}

async function loadLibrairyConfig(
  projectDirectory: string
): Promise<{ partialLibraryConfig: PartialLibraryConfig; configPath: string }> {
  const cosmicConfigResult = await cosmiconfig(LIB_NAME, {
    stopDir: projectDirectory,
  }).search();

  if (cosmicConfigResult === null) {
    console.error(`Could not find a valid configuration.`);
    process.exit(1);
  } else if (cosmicConfigResult.isEmpty === true) {
    console.error(
      `The configuration is empty. (path: ${cosmicConfigResult.filepath})`
    );
    process.exit(1);
  } else if (cosmicConfigResult.config === undefined) {
    console.error(
      `An unknown error occured when loading the config file. (path: ${cosmicConfigResult.filepath})`
    );
    process.exit(1);
  } else {
    return {
      partialLibraryConfig: cosmicConfigResult.config as PartialLibraryConfig,
      configPath: path.dirname(cosmicConfigResult.filepath),
    };
  }
}

async function validateLibraryConfig(
  partialLibraryConfig: Partial<LibraryConfigObject>,
  configPath: string
): Promise<LibraryConfigObject> {
  const validatedPartialConfig: Partial<LibraryConfigObject> = {};

  if (typeof partialLibraryConfig.input === "string") {
    const inputPath = path.resolve(configPath, partialLibraryConfig.input);
    if (!(await fileExists(inputPath))) {
      console.error(`\`input\` path could not be found. (path: ${inputPath})`);
      process.exit(1);
    }

    validatedPartialConfig.input = inputPath;
  }

  if (partialLibraryConfig.normalizeInput !== undefined) {
    if (typeof partialLibraryConfig.normalizeInput !== "function") {
      console.error(
        `\`normalizeInput\` is not a function. Skipping input normalization.`
      );
    } else {
      validatedPartialConfig.normalizeInput =
        partialLibraryConfig.normalizeInput;
    }
  }

  if (
    partialLibraryConfig.operations === undefined &&
    typeof partialLibraryConfig.operations !== "object"
  ) {
    console.error(
      `\`operations\` is a required object and should have at least one operation.`
    );
    process.exit(1);
  } else {
    const operations = partialLibraryConfig.operations;
    validatedPartialConfig.operations = await validateLibraryConfigOperations(
      operations
    );
  }

  return validatedPartialConfig as LibraryConfigObject;
}

async function validateLibraryConfigOperations(
  partialOperations: DeepPartial<Operations>
): Promise<Operations> {
  if (Object.keys(partialOperations).length <= 0) {
    console.error(
      `At least one operation is required under the \`operations\` key.`
    );
    process.exit(1);
  }

  const operations = Object.entries(partialOperations).filter(([key, op]) => {
    const isValid = op?.hasOwnProperty("output") || false;
    if (!isValid) {
      console.warn(`\`${key}.output\` is required. Skipping operation.`);
    }
    return isValid;
  }) as [OperationsKeys, NonNullable<Partial<OperationsValues>>][];

  operations.map(([name, config]) => {
    switch (name) {
      case "openapi": {
        partialOperations.openapi = validateOpenApiOperation(config);
        break;
      }
      case "codegen": {
        partialOperations.codegen = validateCodeGenOperation(config);
        break;
      }
    }
  });

  if (operations.length <= 0) {
    console.error(`No valid operations available.`);
    process.exit(1);
  }

  return partialOperations as Operations;
}

function validateCodeGenOperation(
  codegenOperation: Partial<CodeGenOperation>
): CodeGenOperation {
  const operationIsAnArray = Array.isArray(codegenOperation.type);
  if (
    codegenOperation.type === undefined ||
    (typeof codegenOperation.type !== "string" && !operationIsAnArray)
  ) {
    console.error(`\`codegen.type\` must be a string or an array.`);
    process.exit(1);
  }

  const allowedOperations: CodeGenType[] = ["typings", "contracts", "fastify"];

  if (operationIsAnArray) {
    // Typescript bug: it does not refine the Array.isArray type
    const [name, config] = (codegenOperation.type as unknown) as Partial<
      CodeGenFastifyOperationArray
    >;
    if (typeof name !== "string" || name !== "fastify") {
      console.error(
        `\`codegen.type[0]\` must be a string with the value \`fastify\`.`
      );
      process.exit(1);
    }
    if (config === undefined || typeof config !== "object") {
      console.error(`\`codegen.type[1]\` must be an object.`);
      process.exit(1);
    } else if (typeof config.iotsRouter !== "boolean") {
      console.error(`\`codegen.type[1].iotsRouter\` must be a boolean.`);
      process.exit(1);
    } else if (typeof config.noSchemas !== "boolean") {
      console.error(`\`codegen.type[1].noSchemas\` must be a boolean.`);
      process.exit(1);
    }
  } else if (
    allowedOperations.find((value) => value === codegenOperation.type) ===
    undefined
  ) {
    console.error(
      `\`codegen.type\` must be one of the following: ${allowedOperations.join(
        ", "
      )}.`
    );
    process.exit(1);
  }

  return codegenOperation as CodeGenOperation;
}

function makeConfig(
  cliConfig: CLIConfig,
  projectConfig: PartialBaseConfig,
  libraryConfig: LibraryConfigObject
): Config {
  const meta: Omit<Config, "operations"> = {
    name: cliConfig.name || projectConfig.name,
    version: cliConfig.version || projectConfig.version || "0.0.0",
    mode: cliConfig.mode,
    input: libraryConfig.input,
    normalizeInput: libraryConfig.normalizeInput,
  };

  let operations: PropType<Config, "operations"> = {};

  if (libraryConfig.operations.openapi !== undefined) {
    operations = {
      ...operations,
      openapi: {
        ...libraryConfig.operations.openapi,
        dryRun: libraryConfig.operations.openapi.dryRun ?? false,
        validateSchema: libraryConfig.operations.openapi.validateSchema ?? true,
      },
    };
  }

  if (libraryConfig.operations.codegen !== undefined) {
    const codegenIsArray = isArray(libraryConfig.operations.codegen.type);

    if (libraryConfig.operations.codegen.type === "fastify" || codegenIsArray) {
      const codegenType = libraryConfig.operations.codegen.type as
        | "fastify"
        | CodeGenFastifyOperationArray;
      const iotsRouter = isArray(codegenType)
        ? codegenType[1].iotsRouter
        : false;
      const noSchemas = isArray(codegenType) ? codegenType[1].noSchemas : false;

      operations = {
        ...operations,
        codegen: {
          output: libraryConfig.operations.codegen.output,
          type: "fastify",
          iotsRouter: iotsRouter ?? false,
          noSchemas: noSchemas ?? false,
        },
      };
    } else if (
      libraryConfig.operations.codegen.type === "typings" ||
      libraryConfig.operations.codegen.type === "contracts"
    ) {
      operations = {
        ...operations,
        codegen: {
          output: libraryConfig.operations.codegen.output,
          type: libraryConfig.operations.codegen.type,
        },
      };
    }
  }

  const config: Config = {
    ...meta,
    operations,
  };

  return config;
}
