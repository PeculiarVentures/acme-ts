import { run } from "./server";

async function main() {
  await run(4000);
}

main().catch(e => console.error(e));
