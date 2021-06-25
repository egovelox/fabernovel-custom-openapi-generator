#!/usr/bin/env node

import { run } from "./app";

run()
  .then(() => console.info("Done."))
  .catch((error) => console.error(error));
