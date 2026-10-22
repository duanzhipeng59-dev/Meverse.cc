// 生成 app/myfate-china-regions.ts 的全国地级市真实区县数据。
// 数据源:modood/Administrative-divisions-of-China(民政部行政区划,GitHub raw)。
// 锚点策略保持不变:站点城市(vedicCities)保留真实 cityId,其余城市折算到省会锚点
// cityId 做真太阳时折算——本脚本只替换区县列表,锚点关系完整继承旧文件。
//
// 用法:node scripts/gen-china-regions.mjs(需网络,数据缓存到 .cache/pca-code.json)
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cachePath = path.join(root, ".cache", "pca-code.json");

async function loadPca() {
  if (!existsSync(cachePath)) {
    mkdirSync(path.dirname(cachePath), { recursive: true });
    const url = "https://raw.githubusercontent.com/modood/Administrative-divisions-of-China/master/dist/pca-code.json";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`下载行政区划数据失败: HTTP ${res.status}`);
    writeFileSync(cachePath, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(readFileSync(cachePath, "utf8"));
}

// 打包现有 TS 数据模块并读取(锚点关系 + 港澳台/海外)
const oldBundle = path.join(root, ".cache", "old-regions.mjs");
execSync(`npx esbuild app/myfate-china-regions.ts --bundle --format=esm --outfile=${JSON.stringify(oldBundle)}`, { cwd: root, stdio: "pipe" });
const { regionProvinces } = await import(oldBundle);

// 旧文件省 → 市 → 锚点 cityId(继承锚点关系)
const anchorByProvince = new Map(regionProvinces.map((p) => [p.name, new Map(p.cities.map((c) => [c.name, c.cityId]))]));

const pca = await loadPca();
const KEEP_PROVINCES = new Set(["香港特别行政区", "澳门特别行政区", "台湾省", "海外"]);
const oldSpecial = regionProvinces.filter((p) => KEEP_PROVINCES.has(p.name));
const oldByName = new Map(regionProvinces.map((p) => [p.name, p]));

const isDistrict = (name) => !["市辖区", "县"].includes(name);
const looksLikeTown = (list) => list.some((d) => d.includes("街道"));

function districtsOf(city) {
  // 直辖市聚合层("市辖区"/"县")拍平
  const names = [];
  for (const child of city.children ?? []) {
    if (isDistrict(child.name)) names.push(child.name);
    else for (const grand of child.children ?? []) if (isDistrict(grand.name)) names.push(grand.name);
  }
  if (!names.length || looksLikeTown(names)) return ["中心城区"]; // 不设区的市(东莞/中山/直辖县级市等)
  return names;
}

const CITY_SUFFIX = /(市|地区|自治州|盟|林区)$/u;
const out = [];
for (const province of pca) {
  const oldProvince = oldByName.get(province.name);
  if (!oldProvince) { console.warn(`旧文件没有省级 ${province.name},跳过`); continue; }
  const anchor = anchorByProvince.get(province.name);
  const capitalAnchor = oldProvince.cities[0].cityId; // 旧文件首项即省会/metro 锚点
  const isMetro = ["北京市", "上海市", "天津市", "重庆市"].includes(province.name);

  if (isMetro) {
    const districts = districtsOf(province);
    out.push({ name: province.name, cities: [{ cityId: capitalAnchor, name: oldProvince.cities[0].name, districts }] });
    continue;
  }

  const cities = [];
  const provinceManaged = []; // 省直辖县级行政区划下的县级市,给旧文件同名城市兜底用
  for (const city of province.children ?? []) {
    if (city.name === "省直辖县级行政区划") { provinceManaged.push(...city.children ?? []); continue; }
    const displayName = city.name.replace(CITY_SUFFIX, "") || city.name;
    cities.push({ cityId: anchor.get(displayName) ?? capitalAnchor, name: displayName, districts: districtsOf(city) });
  }
  // 旧文件里的省直辖县级市(仙桃/济源等):本身无区,区县固定中心城区
  for (const countyCity of provinceManaged) {
    const displayName = countyCity.name.replace(CITY_SUFFIX, "") || countyCity.name;
    const anchorId = anchor.get(displayName);
    if (anchorId) cities.push({ cityId: anchorId, name: displayName, districts: ["中心城区"] });
  }
  out.push({ name: province.name, cities });
}

// 大陆省份顺序按数据源(基本同旧文件),港澳台/海外原样追加
const finalProvinces = [...out, ...oldSpecial];

const header = `// 「开始解读」弹窗的出生地三级联动数据:省 → 市 → 区/县(全国全部地级市)。
// 由 scripts/gen-china-regions.mjs 生成,数据源:民政部行政区划(modood/Administrative-divisions-of-China)。
// 市级锚点(cityId)用于真太阳时折算——站点城市库(vedicCities)内的城市保留真实 id,
// 其余城市折算到省会锚点 id(同省内经度差对时辰影响可忽略,不为区县编造经度)。
// 区县为真实行政区划;不设区的市(东莞/中山/省直辖县级市等)显示「中心城区」。
// AUTO-GENERATED — do not edit by hand.
export type RegionCity = { cityId: string; name: string; districts: string[] };
export type RegionProvince = { name: string; cities: RegionCity[] };

export const regionProvinces: RegionProvince[] = ${JSON.stringify(finalProvinces)};
`;
writeFileSync(path.join(root, "app", "myfate-china-regions.ts"), header, "utf8");

const totalCities = finalProvinces.reduce((sum, p) => sum + p.cities.length, 0);
const realDistricts = finalProvinces.reduce((sum, p) => sum + p.cities.filter((c) => !c.districts.includes("中心城区")).length, 0);
console.log(`已生成 ${finalProvinces.length} 省 / ${totalCities} 市,其中 ${realDistricts} 市有真实区县`);
