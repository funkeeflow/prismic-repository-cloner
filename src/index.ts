import { cloneSourceRepo } from "./clone";
import { createDestinationRepo } from "./create";

async function main() {
  await cloneSourceRepo();
  await createDestinationRepo();
}

main();
