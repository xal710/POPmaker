import { resolveSearchQueries } from "../server/hareruya";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error("NG", message);
    process.exit(1);
  }
}

const masterBall = resolveSearchQueries("ラプラス (マスターボールミラー)〈131/165〉[SV2a]");
assert(
  masterBall[0] === "ラプラス:マスターボールミラー 131/165 SV2a-Ma",
  `master ball first query: ${masterBall[0]}`,
);
assert(masterBall.includes("131/165 SV2a-Ma"), "includes variant pack query");
assert(masterBall.includes("131/165 SV2a"), "includes base pack query");

const normal = resolveSearchQueries("ムク〈117/081〉[M5]");
assert(normal[0] === "ムク 117/081 M5", `normal first query: ${normal[0]}`);
assert(normal.includes("117/081 M5"), "includes number pack query");

console.log("OK search query order");
console.log("master ball:", masterBall);
console.log("normal:", normal);
