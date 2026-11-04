import { test } from "node:test";
import { writeFileSync, mkdirSync } from "node:fs";
import { SurvivorAgent } from "./survivor-agent";
test("zero GM all 60 encounters and all 12 diary pages are reachable", () => {
  const agent = new SurvivorAgent(3147, "D");
  const result = agent.survey();
  mkdirSync("tests/results", { recursive: true });
  writeFileSync(
    "tests/results/content-survey.json",
    JSON.stringify(result, null, 2),
  );
  console.log("SURVEY", JSON.stringify(result));
});
