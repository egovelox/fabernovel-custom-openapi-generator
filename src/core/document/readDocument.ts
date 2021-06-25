import { fileExists } from "../../utils/files";

import { Document } from "./document";

export async function readDocument(input: string): Promise<Document> {
  const inputExists = await fileExists(input);

  if (inputExists) {
    try {
      return Document.fromFile(input);
    } catch (e) {
      console.error(`Could not parse and validate ${input}\n`);
      process.exit(1);
    }
  } else {
    console.error(`Input file does not exist at ${input}`);
    process.exit(1);
  }
}
