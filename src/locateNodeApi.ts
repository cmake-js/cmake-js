import path from "path";

type LocateNodeApi = ((projectRoot: string) => Promise<string | null>) & {
  __projectRoot?: string;
};

export const locateNodeApi: LocateNodeApi = (module.exports = async (
  projectRoot: string
) => {
  if (locateNodeApi.__projectRoot) {
    // Override for unit tests
    projectRoot = locateNodeApi.__projectRoot;
  }

  try {
    const tmpRequire = require("module").createRequire(
      path.join(projectRoot, "package.json")
    );
    const inc = tmpRequire("node-addon-api");
    return inc.include.replace(/"/g, "");
  } catch (e) {
    // It most likely wasn't found
    return null;
  }
});
