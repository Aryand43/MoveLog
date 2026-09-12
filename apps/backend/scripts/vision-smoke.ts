/** Phase 4 check: assess a photo and print the structured verdict. */
import { readFile } from "node:fs/promises";
import { assessPhoto } from "../src/vision/assess.js";

const path = process.argv[2];
if (!path) throw new Error("usage: tsx scripts/vision-smoke.ts <image>");

const bytes = await readFile(path);
const started = Date.now();
const a = await assessPhoto({
  imageBase64: bytes.toString("base64"),
  mimeType: "image/jpeg",
  itemName: "leather sofa",
  reportedDamage: "tear on the left armrest",
  knownDamage: "",
});
console.log(`assessed in ${Date.now() - started}ms`);
console.log(JSON.stringify(a, null, 2));
