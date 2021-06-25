import { OpenAPIV3, OpenAPI } from "openapi-types";
import SwaggerParser from "swagger-parser";
import { clone } from "../../utils/objects";

export class Document {
  public readonly document: Readonly<OpenAPIV3.Document>;
  public readonly dereferenced: Readonly<OpenAPIV3.Document>;

  private constructor(
    document: OpenAPIV3.Document,
    dereferenced: OpenAPIV3.Document
  ) {
    this.document = Object.freeze(clone(document));
    this.dereferenced = Object.freeze(clone(dereferenced));
  }

  private static async build(document: OpenAPIV3.Document): Promise<Document> {
    return new Document(
      document,
      (await SwaggerParser.dereference(clone(document))) as OpenAPIV3.Document
    );
  }

  static async fromFile(api: string): Promise<Document> {
    try {
      const document = await SwaggerParser.parse(api);
      if (Document.isV3(document)) {
        return Document.build(document);
      } else {
        throw new Error("document is not a valid V3 OpenAPI document");
      }
    } catch (e) {
      console.error("Could not parse OpenAPI document", e);
      throw e;
    }
  }

  private static isV3(
    openapi: OpenAPI.Document
  ): openapi is OpenAPIV3.Document {
    return (
      (openapi as OpenAPIV3.Document).openapi !== undefined &&
      /^3\.0\./.test((openapi as OpenAPIV3.Document).openapi)
    );
  }

  public validate = async (): Promise<Document> => {
    return await Document.build(
      (await SwaggerParser.validate(clone(this.document))) as OpenAPIV3.Document
    );
  };

  public updateWith = async (
    op: (input: OpenAPIV3.Document) => OpenAPIV3.Document
  ): Promise<Document> => {
    return Document.build(op(this.document));
  };

  public toJson = (): string => {
    return JSON.stringify(this.document, null, 2);
  };
}
