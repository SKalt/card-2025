import fs from "node:fs"
import { type } from "node:os"
const raw = fs.readFileSync("PhillyAttractions.csv", "utf-8")
let result = {type: "FeatureCollection", features: []}
for (let part of raw.split(/"POINT \(/).slice(1)) {
  let [pre, post] = part.split(')"', 2)
  const [lon, lat] = pre.split(" ").map(n => parseFloat(n)) // https://learn.microsoft.com/en-us/bingmaps/v8-web-control/modules/well-known-text-module , https://macwright.com/lonlat/
  const [name] = post.slice(1).split(",", 2)
  const rest = post.slice(1 + name.length + 1)
  let _a = rest.split("\n---\n")
  let _tags = _a.filter(f => f.startsWith("tags: ")).map(t => t.slice(6))
  const tags = _tags[0]?.split(", ").map(t => t.trim()) ?? []
  const description = _a.filter(f => !f.startsWith("tags:"))[0]?.trim()
  result.features.push({type: "Feature", "geometry": {type: "Point", coordinates: [lon, lat]}, properties: {name, tags, description}})
}
console.log(JSON.stringify(result, null, 2))
