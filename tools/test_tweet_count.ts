import { buildTweetText } from "../src/utils/format";
import { countTweetCharacters, TWEET_MAX_LENGTH } from "../src/utils/tweetCount";

const text = buildTweetText("ゼルネアスEX〈038/036〉[CP5]", 70000);
const count = countTweetCharacters(text);

console.log("count", count);
console.log("remaining", TWEET_MAX_LENGTH - count);

const checks: Array<[string, number]> = [
  ["a", 0.5],
  ["あ", 1],
  ["\n", 0.5],
  ["ab\n", 1.5],
  ["hareruya2.com/pages/buying", 13],
];

for (const [sample, expected] of checks) {
  const actual = countTweetCharacters(sample);
  if (actual !== expected) {
    console.error(`NG "${sample.replace(/\n/g, "\\n")}" expected ${expected}, got ${actual}`);
    process.exit(1);
  }
}

if (count <= 0 || count > TWEET_MAX_LENGTH) {
  console.error(`Sample tweet count looks wrong: ${count}`);
  process.exit(1);
}

console.log("sample tweet", count);
console.log("OK");
