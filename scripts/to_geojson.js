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
// match icons to features
for (let f of result.features) {
  let p = f.properties
  p.icon = "marker" // default
  if (p.tags.includes("drinks")) p.icon = "bar"
  if (p.tags.includes("food"))  p.icon = "restaurant"
  if (p.tags.includes("coffee") || p.tags.includes("breakfast") || p.tags.includes("brunch"))  p.icon = "cafe"
  if (p.tags.includes("pizza"))  p.icon = "pizza"
  if (p.tags.includes("asian")) p.icon = "asian"
  if (p.tags.includes("theater")) p.icon = "theatre"
  if (p.tags.includes("historic")) p.icon = "historic"
  if (p.tags.includes("pastries") || p.tags.includes("bakery")) p.icon = "bakery"
  if (p.tags.includes("thrift stores") || p.tags.includes("shopping")) p.icon = "shop"
  if (p.tags.includes("museum")) p.icon = "museum"
  if (p.tags.includes("exercise")) p.icon = "fitness"
  if (p.tags.includes("parks")) p.icon = "park"
  if (p.tags.includes("ice cream")) p.icon = "iceCream"
  if (p.tags.includes('art')) p.icon = "art"
  if (p.tags.includes("dogs")) p.icon = "dog"
  if (p.tags.some(t => t.includes("books"))) p.icon = "books"
  if (p.tags.includes("cats") || p.tags.includes("cat")) p.icon = "cat"
  if (p.tags.includes("music")) p.icon = "music"
  // name-based overrides
  if (/museum/i.test(p.name)) p.icon = "museum"
  if (/spinning chairs/i.test(p.name)) p.icon = "hairdresser"
  if (/church/i.test(p.name)) p.icon = "cross"
  if (/children's hospital/i.test(p.name)) p.icon = "hospital"
  if (/30th/i.test(p.name)) p.icon = "rail"
  if (/cinemark/i.test(p.name)) p.icon = "cinema"

}
console.log(JSON.stringify(result, null, 2))
