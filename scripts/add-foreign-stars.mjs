// 向 celebrity_profiles 增补 10 位欧美名人(歌手/演员/企业家),并打乱全部排序。
// 出生日期均为公开确凿信息;出生时辰未公开,统一按正午 12:00 排盘(description 已注明)。
// 运行:npx esbuild scripts/add-foreign-stars.mjs --bundle --platform=node --format=esm --outfile=.cache/add-stars.mjs && node .cache/add-stars.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildBaziChart } from "../app/myfate-bazi-engine";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#")).map((l) => {
  const key = l.slice(0, l.indexOf("=")).trim();
  let value = l.slice(l.indexOf("=") + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return [key, value];
}));
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

const PORTRAIT_BASE = "https://image-search-mcp-cn-beijing.oss-cn-beijing.aliyuncs.com/image-search-mcp/images-ppt";
const NY = { tz: "America/New_York" };
const STARS = [
  {
    id: "taylor-swift", name: "泰勒·斯威夫特", nameEn: "Taylor Swift", gender: "female",
    role: "美国歌手-泰勒·斯威夫特", group: "美国歌手",
    birthDate: "1989-12-13", place: "雷丁 · 美国", lat: 40.335, lon: -75.927, ...NY,
    relationshipStyle: "在关系里重视被清晰理解,习惯用文字与仪式感表达在意,边界分明。",
    mbti: "ENFP",
    tagline: "把每一段人生写成爆款叙事的传奇唱作人",
    description: "美国传奇唱作歌手,以自传式叙事创作著称,从乡村音乐起家一路改写流行乐工业规则,是格莱美年度专辑最年轻得主之一,时代巡回更成为现象级文化事件。舞台之外以精明的商业头脑与版权抗争闻名。出生时辰未公开,命盘按正午排定,仅供参考。",
    traits: ["叙事创作", "商业头脑", "掌控力强"],
    categories: ["欧美明星", "歌手", "唱作人", "美国"],
    portrait: `${PORTRAIT_BASE}/8f4be8a2a837.jpg`,
  },
  {
    id: "billie-eilish", name: "比莉·艾利什", nameEn: "Billie Eilish", gender: "female",
    role: "美国歌手-比莉·艾利什", group: "美国歌手",
    birthDate: "2001-12-18", place: "洛杉矶 · 美国", lat: 34.052, lon: -118.244, tz: "America/Los_Angeles",
    relationshipStyle: "相处松弛直接,不喜欢被定义,需要大量独处与创作空间。",
    mbti: "INFP",
    tagline: "用气声低语定义一代人审美的天才少女",
    description: "美国新生代歌手,与哥哥 Finneas 在卧室里做出首张专辑即横扫格莱美四大通类奖项,史上最年轻达成者。以暗黑极简的气声唱腔、中性松弛的公众形象与环保主张著称,Z 世代最具代表性的文化偶像之一。出生时辰未公开,命盘按正午排定,仅供参考。",
    traits: ["气声唱腔", "反叛审美", "少年成名"],
    categories: ["欧美明星", "歌手", "美国"],
    portrait: `${PORTRAIT_BASE}/581da1f7791c.jpg`,
  },
  {
    id: "ed-sheeran", name: "艾德·希兰", nameEn: "Ed Sheeran", gender: "male",
    role: "英国歌手-艾德·希兰", group: "英国歌手",
    birthDate: "1991-02-17", place: "哈利法克斯 · 英国", lat: 53.721, lon: -1.86, tz: "Europe/London",
    relationshipStyle: "陪伴型恋人,重视日常小确幸,情绪稳定,恋家且长情。",
    mbti: "ISFP",
    tagline: "一把吉他加一台循环踏板撑起体育场巡演的数学诗人",
    description: "英国唱作歌手,以「一人一吉他一循环踏板」的现场表演模式闻名,从街头卖唱到全球体育场巡演。多首单曲打破流媒体纪录,是本世纪最畅销的音乐人之一。公众形象亲切随性,创作高产且旋律天赋突出。出生时辰未公开,命盘按正午排定,仅供参考。",
    traits: ["旋律天才", "亲民随性", "高产出"],
    categories: ["欧美明星", "歌手", "英国"],
    portrait: `${PORTRAIT_BASE}/9000333d70ee.jpg`,
  },
  {
    id: "the-weeknd", name: "威肯", nameEn: "The Weeknd", gender: "male",
    role: "加拿大歌手-威肯", group: "加拿大歌手",
    birthDate: "1990-02-16", place: "多伦多 · 加拿大", lat: 43.653, lon: -79.383, tz: "America/Toronto",
    relationshipStyle: "关系浓烈而私密,慢热且防备心强,一旦信任便极度投入。",
    mbti: "INFP",
    tagline: "从匿名上传到超级碗中场的世界级暗夜之声",
    description: "加拿大歌手、制作人,早期以匿名方式在网上发布混音带走红,把 R&B 与电子暗色美学推至主流巅峰,是流媒体时代最具影响力的男声之一,曾登超级碗中场秀。以低调神秘的私域风格与电影感视觉叙事著称。出生时辰未公开,命盘按正午排定,仅供参考。",
    traits: ["暗夜美学", "低调神秘", "电影感"],
    categories: ["欧美明星", "歌手", "加拿大"],
    portrait: `${PORTRAIT_BASE}/e00bb74c7d8e.jpg`,
  },
  {
    id: "leonardo-dicaprio", name: "莱昂纳多·迪卡普里奥", nameEn: "Leonardo DiCaprio", gender: "male",
    role: "美国演员-莱昂纳多·迪卡普里奥", group: "美国演员",
    birthDate: "1974-11-11", place: "洛杉矶 · 美国", lat: 34.052, lon: -118.244, tz: "America/Los_Angeles",
    relationshipStyle: "魅力型社交者,对伴侣要求独立有趣,讨厌被关系束缚。",
    mbti: "ESFP",
    tagline: "从少年偶像到方法论演技派的长跑冠军",
    description: "美国演员、制片人,童星出身,凭《泰坦尼克号》成为全球偶像后主动转型硬核演技派,终以《荒野猎人》拿下奥斯卡影帝。长期与名导合作,戏路宽广;片场之外是坚定的环保活动家与投资人。出生时辰未公开,命盘按正午排定,仅供参考。",
    traits: ["方法论演技", "戏路宽广", "环保活动家"],
    categories: ["欧美明星", "演员", "美国"],
    portrait: `${PORTRAIT_BASE}/14c5ea62881e.jpg`,
  },
  {
    id: "scarlett-johansson", name: "斯嘉丽·约翰逊", nameEn: "Scarlett Johansson", gender: "female",
    role: "美国演员-斯嘉丽·约翰逊", group: "美国演员",
    birthDate: "1984-11-22", place: "纽约 · 美国", lat: 40.713, lon: -74.006, ...NY,
    relationshipStyle: "观点鲜明的直球型相处,欣赏智识碰撞,吃软不吃硬。",
    mbti: "ISFP",
    tagline: "黑寡妇之外,文艺片与商业片通吃的百变女主",
    description: "美国演员,童星出身,既能在漫威宇宙塑造最具人气的黑寡妇,也能在《婚姻故事》《她》等文艺片中贡献奥斯卡级表演,是好莱坞片酬最高的女演员之一。声线低沉独特,兼具商业号召力与独立电影品味。出生时辰未公开,命盘按正午排定,仅供参考。",
    traits: ["百变戏路", "低音魅力", "商业与文艺通吃"],
    categories: ["欧美明星", "演员", "美国"],
    portrait: `${PORTRAIT_BASE}/19b52b620e7e.jpg`,
  },
  {
    id: "emma-watson", name: "艾玛·沃特森", nameEn: "Emma Watson", gender: "female",
    role: "英国演员-艾玛·沃特森", group: "英国演员",
    birthDate: "1990-04-15", place: "巴黎 · 法国", lat: 48.857, lon: 2.352, tz: "Europe/Paris",
    relationshipStyle: "平等对话型伴侣,重视共同成长与彼此事业,反感控制。",
    mbti: "INFJ",
    tagline: "从赫敏到联合国演讲台的学霸行动派",
    description: "英国演员,9 岁凭《哈利·波特》赫敏一角闻名全球,之后在布朗大学完成学业,戏路转向《美女与野兽》《小妇人》等作品。联合国妇女署亲善大使,发起 HeForShe 运动,是学者气质与社会活动结合的代表人物。出生时辰未公开,命盘按正午排定,仅供参考。",
    traits: ["学霸气质", "社会活动家", "优雅知性"],
    categories: ["欧美明星", "演员", "英国"],
    portrait: `${PORTRAIT_BASE}/da88949910dd.jpg`,
  },
  {
    id: "elon-musk", name: "埃隆·马斯克", nameEn: "Elon Musk", gender: "male",
    role: "企业家-埃隆·马斯克", group: "企业家",
    birthDate: "1971-06-28", place: "比勒陀利亚 · 南非", lat: -25.747, lon: 28.229, tz: "Africa/Johannesburg",
    relationshipStyle: "工作永远排在关系前面,需要能自转的伴侣,沟通直接不留情面。",
    mbti: "INTJ",
    tagline: "把科幻当项目管理清单来执行的头号冒险家",
    description: "出生于南非的企业家,先后创立或主导 SpaceX、特斯拉、Neuralink 等公司,把电动车、可回收火箭从设想变成产业现实,是人类现代最具争议也最具颠覆性的商业人物。工作强度与表达欲同样惊人,以第一性原理思维著称。出生时辰未公开,命盘按正午排定,仅供参考。",
    traits: ["第一性原理", "极致冒险", "话题体质"],
    categories: ["欧美明星", "企业家", "科技"],
    portrait: `${PORTRAIT_BASE}/250784e6836b.jpg`,
  },
  {
    id: "jeff-bezos", name: "杰夫·贝索斯", nameEn: "Jeff Bezos", gender: "male",
    role: "企业家-杰夫·贝索斯", group: "企业家",
    birthDate: "1964-01-12", place: "阿尔伯克基 · 美国", lat: 35.084, lon: -106.65, tz: "America/Denver",
    relationshipStyle: "数据型决策者,关系里同样目标导向,重视长期承诺与家庭仪式。",
    mbti: "ENTJ",
    tagline: "从网上书店到太空公司的长期主义赌徒",
    description: "美国企业家,亚马逊创始人,从一家网上书店做起,以「客户至上」与长期亏损换规模的战略改写全球零售与云计算格局,个人长期位居世界首富前列。卸任 CEO 后专注蓝色起源太空公司,奉行「遗憾最小化」决策框架。出生时辰未公开,命盘按正午排定,仅供参考。",
    traits: ["长期主义", "客户至上", "太空野心"],
    categories: ["欧美明星", "企业家", "科技"],
    portrait: `${PORTRAIT_BASE}/a51d8f0dc177.jpg`,
  },
  {
    id: "mark-zuckerberg", name: "马克·扎克伯格", nameEn: "Mark Zuckerberg", gender: "male",
    role: "企业家-马克·扎克伯格", group: "企业家",
    birthDate: "1984-05-14", place: "怀特普莱恩斯 · 美国", lat: 41.034, lon: -73.763, ...NY,
    relationshipStyle: "稳定长线型伴侣,家庭生活低调规律,重视信任与默契。",
    mbti: "INTJ",
    tagline: "宿舍里写出的社交帝国与它的极客掌门",
    description: "美国企业家,Facebook(现 Meta)创始人,哈佛宿舍期间写出社交网络原型,20 多岁即执掌全球最大社交平台之一,如今押注元宇宙与开源大模型。程序员出身的极客气质浓厚,以快速迭代与激进收购策略著称。出生时辰未公开,命盘按正午排定,仅供参考。",
    traits: ["极客底色", "快速迭代", "激进下注"],
    categories: ["欧美明星", "企业家", "科技"],
    portrait: `${PORTRAIT_BASE}/f581a8951e4b.jpg`,
  },
];

// ── 1. 下载并上传肖像到 celebrity-portraits/profiles/ ──────────────────
async function uploadPortrait(star) {
  const res = await fetch(star.portrait);
  if (!res.ok) throw new Error(`${star.id} 肖像下载失败 HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const path = `profiles/${star.id}.${ext}`;
  const { error } = await supabase.storage.from("celebrity-portraits").upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`${star.id} 肖像上传失败: ${error.message}`);
  const { data } = supabase.storage.from("celebrity-portraits").getPublicUrl(path);
  return data.publicUrl;
}

// ── 2. 引擎排三柱(与现有数据同源计算) ────────────────────────────────────
function threePillarsOf(star) {
  const chart = buildBaziChart({
    birthDate: star.birthDate, birthTime: "12:00", gender: star.gender,
    city: { id: star.id, name: star.place, lat: star.lat, lon: star.lon, tz: star.tz },
  });
  return chart.pillars.map((pillar) => `${pillar.ganzhi[0]}${pillar.ganzhi[1]}`).join(" · ").slice(0, 0) || chart.pillars.map((p) => p.ganzhi).join(" · ");
}

// ── 3. 插库(upsert)+ 打乱全库排序 ──────────────────────────────────────
for (const star of STARS) {
  const portraitUrl = await uploadPortrait(star);
  const threePillars = threePillarsOf(star);
  // created_at 交错落在最近 4 天(进入"最新收录"且顺序自然打乱);workspace_position 先给随机高位
  const daysAgo = Math.floor(Math.random() * 4) + 1;
  const jitterHours = Math.floor(Math.random() * 20);
  const createdAt = new Date(Date.now() - daysAgo * 86400_000 - jitterHours * 3600_000).toISOString();
  const row = {
    id: star.id, name: star.name, name_en: star.nameEn, role: star.role,
    tagline: star.tagline, description: star.description,
    relationship_style: star.relationshipStyle, focus: "", mbti: star.mbti ?? "",
    birth_date: star.birthDate, birth_time: "12:00",
    birth_place: star.place, birth_lat: star.lat, birth_lon: star.lon, birth_tz: star.tz,
    gender: star.gender, three_pillars: threePillars, traits: star.traits, categories: star.categories,
    match_count: 0, portrait_url: portraitUrl,
    ideal: { security: 50, expression: 50, independence: 50, conflict: 50, novelty: 50 },
    report_prompt: null, published: true, homepage_featured: false,
    workspace_position: Math.floor(Math.random() * 800) + 100,
    created_at: createdAt,
  };
  const { error } = await supabase.from("celebrity_profiles").upsert(row);
  if (error) throw new Error(`${star.id} 入库失败: ${error.message}`);
  console.log(`✓ ${star.name}(${star.id}) 三柱 ${threePillars}`);
}

// 打乱全部已发布人物的"全部"列表顺序:workspace_position 全库随机重排
const { data: all, error: listError } = await supabase.from("celebrity_profiles").select("id").eq("published", true);
if (listError) throw listError;
const ids = all.map((r) => r.id);
for (let i = ids.length - 1; i > 0; i -= 1) {
  const j = Math.floor(Math.random() * (i + 1));
  [ids[i], ids[j]] = [ids[j], ids[i]];
}
for (let index = 0; index < ids.length; index += 1) {
  const { error } = await supabase.from("celebrity_profiles").update({ workspace_position: index + 1 }).eq("id", ids[index]);
  if (error) throw error;
}
console.log(`✓ 全库 ${ids.length} 人顺序已随机打乱`);
