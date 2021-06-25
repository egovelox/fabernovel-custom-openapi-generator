import { Config } from "../../core/config";
import { Document } from "./document";

export async function normalizeDocument(
  api: Document,
  config: Config
): Promise<Document> {
  const prenormalizedAPI = await api.updateWith((input) => ({
    ...input,
    info: {
      ...input.info,
      title: config.name,
      version: config.version,
    },
  }));

  const normalizeInput = config.normalizeInput;
  if (normalizeInput !== undefined) {
    return prenormalizedAPI.updateWith((input) =>
      normalizeInput(input, config)
    );
  } else {
    return prenormalizedAPI;
  }
}
