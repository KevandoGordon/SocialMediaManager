/**
 * Writes the sample data to a data file for the browser tests, e.g.
 *   DATA_FILE=/tmp/sc-test.json npx tsx tests/seed-fixtures.mts
 *   DATA_FILE=/tmp/sc-test.json npm run dev
 * Every fixture user signs in with FIXTURE_PASSWORD. Never point this at your real .data/store.json.
 */
import * as stateNs from "../lib/server/state";
import * as fixturesNs from "./fixtures";

const unwrap = <T,>(ns: T) => (ns as T & { default?: T }).default ?? ns;
const { replaceState } = unwrap(stateNs);
const { fixtureState } = unwrap(fixturesNs);

if (!process.env.DATA_FILE || process.env.DATA_FILE.endsWith(".data/store.json")) {
  console.error("Set DATA_FILE to a separate test file.");
  process.exit(1);
}
replaceState(fixtureState());
console.log(`Wrote sample data to ${process.env.DATA_FILE}`);
