import path from "path";
import findGitRoot from "find-git-root";

import { fileExists } from "../../utils/files";

export async function findProjectRoot() {
  const projectRoot = getProjectRoot();
  let currentDirectory = process.cwd().split("/");
  do {
    const packagePath = path.resolve(
      currentDirectory.join("/"),
      "package.json"
    );
    if (await fileExists(packagePath)) {
      return currentDirectory.join("/");
    }
    currentDirectory.pop();
  } while (
    path.relative(projectRoot, currentDirectory.join("/")) === "" ||
    currentDirectory.length > 0
  );
  throw new Error(
    `Could not locate package.json at project root. It is mandatory. (project root: ${projectRoot})`
  );
}

function getProjectRoot() {
  try {
    const gitFolder = findGitRoot(process.cwd());
    const root = path.normalize(path.resolve(gitFolder, ".."));
    return root;
  } catch (e) {
    console.warn(
      `Could not find the project root directory (folder containing .git/).
Using current folder as root.`
    );
    return process.cwd();
  }
}
