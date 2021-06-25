import { Config } from "../../core/config";
import { readDocument } from "./readDocument";
import { normalizeDocument } from "./normalizeDocument";

export async function loadDocument(config: Config) {
  const document = await readDocument(config.input);

  try {
    const documentNormalized = await normalizeDocument(document, config);
    return documentNormalized;
  } catch (e) {
    console.error(
      "Could not normalize input. Does the function return a valid document?"
    );
    process.exit(1);
  }
}
