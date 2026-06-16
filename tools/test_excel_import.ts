import { readComparisonFromExcel } from "../server/excel";

const payload = readComparisonFromExcel();
console.log("source:", payload.source);
console.log("items:", payload.items.length);
console.log("dataDate:", payload.dataDate);
console.log("excelModifiedAt:", payload.excelModifiedAt);
console.log("top3:", payload.items.slice(0, 3));
