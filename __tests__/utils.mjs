// @ts-check
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSchema, parse, validate } from "graphql";
import { depthLimit } from "../dist/index.js";

export const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {Map<string, import("graphql").GraphQLSchema>} */
const schemaByFilename = new Map();
function getSchema(schemaFilename = "simple.graphql") {
  if (schemaByFilename.has(schemaFilename)) {
    return schemaByFilename.get(schemaFilename);
  }
  const schemaText = readFileSync(`${__dirname}/${schemaFilename}`, "utf8");
  const schema = buildSchema(schemaText);
  schemaByFilename.set(schemaFilename, schema);
  return schema;
}

/**
 * @param {string} operationText
 * @param {import("../dist/index.js").Options} [options]
 * @param {string} [schemaFilename]
 * @param {boolean} [allowInvalidQuery]
 */
export function parseAndValidate(
  operationText,
  options,
  schemaFilename,
  allowInvalidQuery = false,
) {
  const schema = getSchema(schemaFilename);
  const document = parse(operationText);
  const rule = depthLimit(options);
  if (!allowInvalidQuery) {
    const regularErrors = validate(schema, document);
    if (regularErrors.length) {
      throw new Error(
        `Query was invalid, either pass \`true\` to \`parseAndValidate\` to allow invalid queries, or fix the query. Errors:\n${regularErrors.join("\n")}`,
      );
    }
  }
  const errors = validate(schema, document, [rule]);
  return errors;
}

/**
 * @param {any} obj
 */
export function jsonClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
