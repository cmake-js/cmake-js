import assert from "assert";
import fs from "fs-extra";

import { Dist } from "../../src";

const testDownload = process.env.TEST_DOWNLOAD === "1";

describe("dist", function () {
  it("should download dist files if needed", async function () {
    this.timeout(60000);

    const dist = new Dist();
    if (testDownload) {
      await fs.remove(dist.internalPath);
      assert(!dist.downloaded);
      await dist.ensureDownloaded();
      assert(dist.downloaded);
    } else {
      await dist.ensureDownloaded();
    }
  });
});
