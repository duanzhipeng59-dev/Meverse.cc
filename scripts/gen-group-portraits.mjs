// 生成品牌化占位头像(520×676 webp)并上传 Supabase celebrity-portraits/profiles/{id}.webp
// 组主题色渐变 + 中文名 + 组名;官方图片到位后,替换 bucket 同名对象即可,无需改代码。
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#")).map((l) => {
  const key = l.slice(0, l.indexOf("=")).trim();
  let value = l.slice(l.indexOf("=") + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return [key, value];
}));
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

const THEME = {
  txt: { from: "#1b3a4b", to: "#2e8b8b", label: "TOMORROW X TOGETHER" },
  svt: { from: "#4a2440", to: "#b8336a", label: "SEVENTEEN" },
  skz: { from: "#1d2350", to: "#5561d6", label: "Stray Kids" },
  kickflip: { from: "#0e3a3a", to: "#20b2aa", label: "KickFlip" },
  "2pm": { from: "#2b2b2b", to: "#8a6d2f", label: "2PM" },
  hot: { from: "#262626", to: "#6e6e6e", label: "H.O.T." },
  sju: { from: "#0a2a6e", to: "#2f6fd6", label: "Super Junior" },
  bigbang: { from: "#1a1a0a", to: "#a4c614", label: "BIGBANG" },
  winner: { from: "#3d0e1e", to: "#c2295a", label: "WINNER" },
  ikon: { from: "#222222", to: "#e2571e", label: "iKON" },
};
const MEMBERS = [
  ["yeonjun","崔然竣","txt"],["soobin","崔秀彬","txt"],["beomgyu","崔范奎","txt"],["taehyun","姜泰现","txt"],["huening-kai","休宁凯","txt"],
  ["s-coups","崔胜澈","svt"],["jeonghan","尹净汉","svt"],["joshua","洪知秀","svt"],["jun","文俊辉","svt"],["hoshi","李知勋","svt"],
  ["wonwoo","全圆佑","svt"],["woozi","李知勳","svt"],["dk","李硕珉","svt"],["mingyu","金珉奎","svt"],["the8","徐明浩","svt"],
  ["seungkwan","夫胜宽","svt"],["vernon","崔翰率","svt"],["dino","李灿","svt"],
  ["lee-know","李旻浩","skz"],["changbin","徐彰彬","skz"],["han","韩知城","skz"],["felix","李龙馥","skz"],["seungmin","金升玟","skz"],["i-n","梁精寅","skz"],
  ["kyehoon","Kyehoon","kickflip"],["amaru","Amaru","kickflip"],["donghwa","Donghwa","kickflip"],["juwang","Juwang","kickflip"],["minje","Minje","kickflip"],["keiju","Keiju","kickflip"],["donghyeon","Donghyeon","kickflip"],
  ["jun-k","金敏俊","2pm"],["nichkhun","尼坤","2pm"],["taecyeon","玉泽演","2pm"],["wooyoung","张佑荣","2pm"],["junho","李俊昊","2pm"],["chansung","黄灿盛","2pm"],
  ["moon-hee-jun","文熙俊","hot"],["tony-an","安胜浩","hot"],["jang-woo-hyuk","张佑赫","hot"],["kangta","安七炫","hot"],["lee-jae-won","李在元","hot"],
  ["leeteuk","利特","sju"],["heechul","希澈","sju"],["yesung","艺声","sju"],["shindong","神童","sju"],["sungmin","晟敏","sju"],
  ["eunhyuk","银赫","sju"],["donghae","东海","sju"],["siwon","始源","sju"],["ryeowook","厉旭","sju"],["kyuhyun","圭贤","sju"],
  ["g-dragon","权志龙","bigbang"],["top","崔胜铉","bigbang"],["taeyang","东永裴","bigbang"],["daesung","姜大声","bigbang"],
  ["kim-jinwoo","金秦禹","winner"],["lee-seunghoon","李昇勋","winner"],["mino","宋旻浩","winner"],["kang-seungyoon","姜昇润","winner"],
  ["jay","金振焕","ikon"],["yunhyeong","宋允亨","ikon"],["bobby","金知元","ikon"],["donghyuk","金东赫","ikon"],["june","具俊会","ikon"],["chanwoo","郑粲右","ikon"],
];

const W = 520, H = 676;
for (const [id, name, g] of MEMBERS) {
  const t = THEME[g];
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${t.from}"/><stop offset="1" stop-color="${t.to}"/>
  </linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="${W - 70}" cy="86" r="46" fill="rgba(255,255,255,0.10)"/>
  <circle cx="74" cy="${H - 96}" r="70" fill="rgba(255,255,255,0.07)"/>
  <text x="${W / 2}" y="${H / 2 - 26}" font-family="PingFang SC, Noto Sans SC, sans-serif" font-size="104" font-weight="700"
    fill="rgba(255,255,255,0.94)" text-anchor="middle">${name[0]}</text>
  <text x="${W / 2}" y="${H / 2 + 66}" font-family="PingFang SC, Noto Sans SC, sans-serif" font-size="40" font-weight="500"
    fill="rgba(255,255,255,0.88)" text-anchor="middle" letter-spacing="6">${name}</text>
  <text x="${W / 2}" y="${H - 48}" font-family="Helvetica, Arial, sans-serif" font-size="17"
    fill="rgba(255,255,255,0.62)" text-anchor="middle" letter-spacing="3">${t.label}</text>
</svg>`;
  const buf = await sharp(Buffer.from(svg)).webp({ quality: 88 }).toBuffer();
  const path = `profiles/${id}.webp`;
  const { error } = await supabase.storage.from("celebrity-portraits").upload(path, buf, { contentType: "image/webp", upsert: true });
  if (error) { console.log(`✗ ${id} 上传失败: ${error.message}`); continue; }
  const url = `${env.SUPABASE_URL}/storage/v1/object/public/celebrity-portraits/${path}`;
  const { error: uErr } = await supabase.from("celebrity_profiles").update({ portrait_url: url }).eq("id", id);
  console.log(uErr ? `✗ ${id} 更新失败` : `✓ ${name} → ${path}`);
}

// 方灿/黄铉辰:用仓库现成照片
for (const [id, file] of [["bang-chan", "/bang-chan.webp"], ["hyunjin", "/hyunjin.webp"]]) {
  await supabase.from("celebrity_profiles").update({ portrait_url: file }).eq("id", id);
  console.log(`✓ ${id} → ${file}(仓库现成)`);
}

// 工作台排位归一化:9 起连续
const ORDER = ["yeonjun","soobin","beomgyu","taehyun","huening-kai",
  "s-coups","jeonghan","joshua","jun","hoshi","wonwoo","woozi","dk","mingyu","the8","seungkwan","vernon","dino",
  "bang-chan","lee-know","changbin","hyunjin","han","felix","seungmin","i-n",
  "kyehoon","amaru","donghwa","juwang","minje","keiju","donghyeon",
  "jun-k","nichkhun","taecyeon","wooyoung","junho","chansung",
  "moon-hee-jun","tony-an","jang-woo-hyuk","kangta","lee-jae-won",
  "leeteuk","heechul","yesung","shindong","sungmin","eunhyuk","donghae","siwon","ryeowook","kyuhyun",
  "g-dragon","top","taeyang","daesung",
  "kim-jinwoo","lee-seunghoon","mino","kang-seungyoon",
  "jay","yunhyeong","bobby","donghyuk","june","chanwoo"];
let p = 9;
for (const id of ORDER) { await supabase.from("celebrity_profiles").update({ workspace_position: p }).eq("id", id); p += 1; }
console.log(`✓ 排位归一化 9-${p - 1}`);
