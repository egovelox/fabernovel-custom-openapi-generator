import fs, { promises as fsPromises, constants, PathLike } from "fs";

export function checkOrCreateFolder(path: string, deep = false) {
  return fs.existsSync(path) || fs.mkdirSync(path, { recursive: deep });
}

export async function copyFile(from: string, to: string) {
  return await fsPromises.copyFile(from, to);
}

export async function fileExists(path: string) {
  try {
    await fsPromises.access(path, constants.R_OK);
    return true;
  } catch (err) {
    return false;
  }
}

export async function fileExistsException(path: string) {
  await fsPromises.access(path, constants.R_OK);
  return true;
}

export async function writeFile(path: PathLike, file: string | Buffer) {
  return await fsPromises.writeFile(path, file);
}
