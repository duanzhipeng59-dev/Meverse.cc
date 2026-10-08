import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildBaziChart } from "../app/myfate-bazi-engine";
import { buildStarBaziReport } from "../app/myfate-star-bazi-report";
import { buildBaziLifeProfile } from "../app/myfate-bazi-profile";
import { buildConsultReport } from "../app/myfate-portrait-consult";
import { tenGod } from "../app/myfate-dual-engine";
import { renderReport } from "./report-text.mjs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#")).map((l) => {
  const key = l.slice(0, l.indexOf("=")).trim();
  let value = l.slice(l.indexOf("=") + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return [key, value];
}));
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

const SEOUL = { place: "首尔 · 韩国", lat: 37.5665, lon: 126.978, tz: "Asia/Seoul" };
// 兵役窗口(事实;window=在役区间,note=归因句;text=已退伍表述)
const MIL = {
  none: null,
  exempt: { type: "exempt", note: "因重伤(ACL 重建手术)获免役——属公开事实,事业线不受兵役打断" },
  window: (from, to, note) => ({ type: "serving", from, to, note }),
  done: (from, to, note) => ({ type: "done", from, to, note }),
};

const GROUPS = {
  txt: {
    label: "TOMORROW X TOGETHER", debut: "2019 年 3 月 4 日", tier: "二线", band: "1500万–5000万",
    edu: "韩国高中体系出身(出道时多为高中在读或毕业阶段,个别成员具体院校未公开);命理倾向为实践型艺术路径",
    y25: "2025 年世界巡演与专辑周期延续", y26: "2026 年团体周期继续推进,个人企划与巡演并行",
    desc: "HYBE 系(Big Hit Music)五人男团,以「成长叙事」与高完成度舞台著称。",
  },
  svt: {
    label: "SEVENTEEN", debut: "2015 年 5 月 26 日", tier: "一线", band: "5000万–2亿",
    edu: "韩国高中体系出身(个别成员具体院校未公开);命理倾向为实践型艺术路径",
    y25: "2025 年出道十周年纪念周期,成员陆续进入兵役阶段", y26: "2026 年成员分批服役与个人企划并行,完整体活动预计 2028 年后重启",
    desc: "HYBE 系(Pledis Entertainment)十三人男团,以「自制作偶像」体系与大型舞台著称。",
  },
  bigbang: {
    label: "BIGBANG", debut: "2006 年 8 月 19 日", tier: "顶流", band: "2亿–10亿级",
    events: [
      [2011, 2016, "神曲王朝时代(Lies→Fantastic Baby→MADE 世界巡演)正落此运,K-pop 全球化的先声"],
      [2022, 2022, "2022 年 4 月四人完整体回归(Still Life)"],
      [2023, 2023, "2023 年起成员相继离开 YG 转入个人厂牌发展"],
    ],
    edu: "韩国高中体系出身;命理倾向为实践型艺术路径",
    y25: "成员个人线为主(权志龙 2025 年个人专辑《Übermensch》回归引发全球热潮),团体合流稀少",
    y26: "个人音乐/演艺线并行,完整体合流以纪念性舞台为主",
    desc: "YG 四人传奇男团(K-pop 全球化先声),现以成员个人厂牌活动为主。",
  },
  winner: {
    label: "WINNER", debut: "2014 年 8 月 12 日", tier: "二线", band: "1500万–5000万",
    events: [[2014, 2015, "出道即以《Empty》横扫的新人王时代正落此运"]],
    edu: "韩国高中体系出身;命理倾向为实践型艺术路径",
    y25: "2025 年退伍成员陆续归队,个人音乐线回温",
    y26: "多数成员退伍归来个人企划并行;完整体合流待定",
    desc: "YG 四人男团(选秀 WIN 冠军队),以抒情与自作曲并行的音乐色著称。",
  },
  ikon: {
    label: "iKON", debut: "2015 年 9 月 15 日", tier: "二线", band: "1500万–5000万",
    events: [
      [2018, 2018, "《Love Scenario》现象级全球爆红(音源王者时代)正落此运"],
      [2023, 2023, "2023 年合约期满离开 YG,转签 143 Entertainment"],
    ],
    edu: "韩国高中体系出身;命理倾向为实践型艺术路径",
    y25: "2025 亚洲巡演展开,退伍成员陆续归队(Jay/Chanwoo/Bobby 相继回归)",
    y26: "允亨 2026 年 2 月退伍归队,五人活动重启在望;DK 临近法定入伍窗口",
    desc: "男团(2015-2023 隶属 YG,现 143 Entertainment),以嘻哈底色与音源实力著称。",
  },
  hot: {
    label: "H.O.T.", debut: "1996 年 9 月 7 日", tier: "二线", band: "1500万–5000万",
    events: [
      [1998, 2000, "一代鼎盛期(IMF 寒冬中连续百万销量的现象级时代)正落此运"],
      [2001, 2001, "2001 年组合解散、成员各奔前程(一代王朝落幕)亦在此运"],
      [2018, 2018, "2018 年 10 月出道 20 周年重聚演唱会(仅此一场)引发全行业怀旧潮"],
    ],
    edu: "韩国高中体系出身;命理倾向为实践型艺术路径",
    y25: "成员个人线为主(Kangta 长期担任 SM 内部理事级职务,文熙俊/安胜浩活跃于综艺与主持)",
    y26: "个人综艺/主持/公司经营线延续,一代传奇的怀旧商业价值长存",
    desc: "SM 一代传奇五人男团(韩国偶像产业的开山组合),1996-2001 活动后解散。",
  },
  sju: {
    label: "Super Junior", debut: "2005 年 11 月 6 日", tier: "二线", band: "1500万–5000万",
    events: [[2009, 2011, "Sorry Sorry 时代的二代巅峰期(韩流全球化的先锋)正落此运"]],
    edu: "韩国高中体系出身;命理倾向为实践型艺术路径",
    y25: "2025 年迎来出道 20 周年,纪念活动与 Super Show 巡演周期延续",
    y26: "20 周年后的长跑期:成员个人线(综艺/音乐剧/演员)与团体合流并行",
    desc: "SM 二代传奇十人男团,以大型编队舞台与综艺感著称,韩流全球化先锋。",
  },
  kickflip: {
    label: "KickFlip", debut: "2025 年 1 月 20 日", tier: "新人上升期", band: "300万–1500万",
    edu: "韩国/日本高中体系在读或毕业阶段(具体院校未公开);命理倾向为实践型艺术路径",
    y25: "2025 年 1 月出道后首年,打歌与新专周期密集展开",
    y26: "2026 年新专《Twenty》周期与巡演展开,新人上升势头延续",
    desc: "JYP 七人男团(出自 SBS 选秀 LOUD),以高难度表演与跨国成员构成著称。",
  },
  "2pm": {
    label: "2PM", debut: "2008 年 9 月 4 日", tier: "二线", band: "1500万–5000万",
    peak: [2009, 2012, "二代巅峰期(Heartbeat 时代)正落此运,野兽派偶像的代表"],
    edu: "韩国高中体系出身;命理倾向为实践型艺术路径",
    y25: "成员以演员与音乐剧个人活动为主,团体周期性合流",
    y26: "个人影视/音乐剧线持续,出道周年纪念性合流与演出周期延续",
    desc: "JYP 二代传奇六人男团(野兽派偶像),成员现以演员与音乐剧活动为主。",
  },
  skz: {
    label: "Stray Kids", debut: "2018 年 3 月 25 日", tier: "一线", band: "5000万–2亿",
    edu: "韩国高中体系出身(个别成员具体院校未公开);命理倾向为实践型艺术路径",
    y25: "2025 年世界巡演(dominATE)周期延续,团体声量维持高位",
    y26: "2026 年 8 月 6 日携新专《THIS & THAT》回归,世界巡演与团体周期并进",
    desc: "JYP 八人男团,以 3RACHA 制作体系与高强度舞台著称。",
  },
};

const MEMBERS = [
  // ── TXT ──
  { id: "yeonjun", name: "崔然竣", en: "Yeonjun", g: "txt", birth: "1999-09-13", ...SEOUL,
    role: "大哥/主舞/说唱担当", mil: MIL.window(2027, 2028, "1999 年生,已进入法定入伍年龄窗口(截至 2026 年 10 月未官宣具体日期)"), milYears: null,
    mil26: "另按韩国兵役制度,TA 已进入法定入伍年龄窗口(未官宣),团体节奏存在 2027-2028 年间断的可能性" },
  { id: "soobin", name: "崔秀彬", en: "Soobin", g: "txt", birth: "2000-12-05", place: "安山 · 京畿道", lat: 37.31, lon: 126.79, tz: "Asia/Seoul",
    role: "队长/主唱担当", mil: MIL.none, mil26: "" },
  { id: "beomgyu", name: "崔范奎", en: "Beomgyu", g: "txt", birth: "2001-03-13", place: "大邱 · 韩国", lat: 35.87, lon: 128.6, tz: "Asia/Seoul",
    role: "主唱/CENTER 担当", mil: MIL.none, mil26: "" },
  { id: "taehyun", name: "姜泰现", en: "Taehyun", g: "txt", birth: "2002-02-05", ...SEOUL,
    role: "主唱担当", mil: MIL.none, mil26: "" },
  { id: "huening-kai", name: "休宁凯", en: "Huening Kai", g: "txt", birth: "2002-08-14", ...SEOUL,
    role: "忙内/主唱担当", mil: MIL.none, mil26: "" },
  // ── SEVENTEEN ──
  { id: "s-coups", name: "崔胜澈", en: "S.Coups", g: "svt", birth: "1995-08-08", place: "大邱 · 韩国", lat: 35.87, lon: 128.6, tz: "Asia/Seoul",
    role: "队长/总表演担当", mil: MIL.exempt, milYears: null,
    mil26: "TA 因重伤(ACL)获免役,是团队兵役周期中唯一不需中断事业线的成员" },
  { id: "jeonghan", name: "尹净汉", en: "Jeonghan", g: "svt", birth: "1995-10-04", ...SEOUL,
    role: "副主唱担当", mil: MIL.done(2024, 2026, "2024-09-26 以社会服务要员入伍,2026-06-25 退伍——团队首位完成兵役的成员"),
    y25: "2025 年社会服务在役期,以企划内容维持存在感", y26: "2026 年 6 月 25 日退伍归来,个人代言与综艺回温,率先重启完整活动" },
  { id: "joshua", name: "洪知秀", en: "Joshua", g: "svt", birth: "1995-12-30", place: "洛杉矶 · 美国", lat: 34.05, lon: -118.24, tz: "America/Los_Angeles",
    role: "副主唱/吉他担当", mil: MIL.none, mil26: "美国籍,无韩国兵役义务——兵役周期内反而成为活动连续性最高的一员" },
  { id: "jun", name: "文俊辉", en: "Jun", g: "svt", birth: "1996-06-10", place: "深圳 · 中国", lat: 22.54, lon: 114.06, tz: "Asia/Shanghai",
    role: "表演担当(中国籍)", mil: MIL.none, mil26: "中国籍,无韩国兵役义务——周期内以中国活动与个人企划保持声量" },
  { id: "hoshi", name: "李知勋", en: "Hoshi", g: "svt", birth: "1996-06-15", ...SEOUL,
    role: "表演队队长/主舞担当", mil: MIL.window("2025-09-16 现役入伍", "约 2027-06 退伍", "2025-09-16 现役入伍(陆军)"),
    y25: "2025 年 9 月 16 日现役入伍,兵役空白期开启", y26: "在役期(预计约 2027-06 退伍);个人内容以库存形式持续释出" },
  { id: "wonwoo", name: "全圆佑", en: "Wonwoo", g: "svt", birth: "1996-07-17", place: "昌原 · 韩国", lat: 35.23, lon: 128.69, tz: "Asia/Seoul",
    role: "副主唱担当", mil: MIL.window("2025-04-03 现役入伍", "约 2027 年初退伍", "2025-04-03 现役入伍"),
    y25: "2025 年 4 月 3 日现役入伍,兵役空白期开启", y26: "在役后期(预计 2027 年初退伍);库存内容与结算照常" },
  { id: "woozi", name: "李知勳", en: "Woozi", g: "svt", birth: "1996-11-22", place: "釜山 · 韩国", lat: 35.18, lon: 129.08, tz: "Asia/Seoul",
    role: "音乐制作人/演唱队队长", mil: MIL.window("2025-09-15 现役入伍", "约 2027-06 退伍", "2025-09-15 现役入伍(陆军)"),
    y25: "2025 年 9 月 15 日现役入伍,兵役空白期开启", y26: "在役期;制作版权收益与团队作品库不受影响,退伍前作品仍在释出" },
  { id: "dk", name: "李硕珉", en: "DK", g: "svt", birth: "1997-02-18", place: "龙仁 · 京畿道", lat: 37.24, lon: 127.2, tz: "Asia/Seoul",
    role: "主唱担当", mil: MIL.window("2026-09-08 现役入伍", "约 2028 年中退伍", "2026-09-08 现役入伍(陆军)"),
    y25: "2025 年十周年周期完整在队,主唱线稳定输出", y26: "9 月 8 日现役入伍;年内完整体与个人活动收官,兵役空白期开启" },
  { id: "mingyu", name: "金珉奎", en: "Mingyu", g: "svt", birth: "1997-04-06", ...SEOUL,
    role: "说唱/门面担当", mil: MIL.window("2026-09-10 社会服务入营", "约 2028-06 结束", "2026-09-10 以替代服务(社会服务要员)入营"),
    y25: "2025 年十周年周期完整在队,代言与综艺声量稳居前列", y26: "9 月 10 日社会服务入营;年内广告代言集中释放后进入空白期" },
  { id: "the8", name: "徐明浩", en: "The8", g: "svt", birth: "1997-11-07", place: "鞍山 · 中国", lat: 41.11, lon: 122.99, tz: "Asia/Shanghai",
    role: "表演担当(中国籍)", mil: MIL.none, mil26: "中国籍,无韩国兵役义务——周期内以中国活动与个人企划保持声量" },
  { id: "seungkwan", name: "夫胜宽", en: "Seungkwan", g: "svt", birth: "1998-01-16", place: "济州 · 韩国", lat: 33.5, lon: 126.53, tz: "Asia/Seoul",
    role: "副主唱/综艺担当", mil: MIL.window("2026-10-26 军乐队入伍(已官宣)", "约 2028 年退伍", "2026-10-26 以陆军军乐队身份入伍(已官宣)"),
    y25: "2025 年十周年周期完整在队,综艺与 OST 双线活跃", y26: "10 月 26 日军乐队入伍(已官宣);年内个人内容密集收官" },
  { id: "vernon", name: "崔翰率", en: "Vernon", g: "svt", birth: "1998-02-18", place: "纽约州 · 美国", lat: 40.98, lon: -73.68, tz: "America/New_York",
    role: "说唱担当(美韩双籍)", mil: MIL.window("2026-08-20 已入伍", "约 2028 年中退伍", "2026-08-20 入伍(美韩双籍,自愿履行兵役义务;入伍前发行告别单曲)"),
    y25: "2025 年十周年周期完整在队,制作与时尚资源并行", y26: "8 月 20 日入伍前发行告别单曲,随后进入兵役空白期" },
  { id: "dino", name: "李灿", en: "Dino", g: "svt", birth: "1999-02-11", place: "益山 · 韩国", lat: 35.95, lon: 126.96, tz: "Asia/Seoul",
    role: "忙内/主舞担当", mil: MIL.window("2026-10-26 军乐队入伍(已官宣)", "约 2028 年退伍", "2026-10-26 以陆军军乐队身份入伍(已官宣)"),
    y25: "2025 年十周年周期完整在队,表演线持续进化", y26: "10 月 26 日军乐队入伍(已官宣);忙内线个人企划收官" },
  // ── Stray Kids ──
  { id: "bang-chan", name: "方灿", en: "Bang Chan", g: "skz", birth: "1997-10-03", ...SEOUL,
    role: "队长/制作人(3RACHA)", mil: MIL.none, mil26: "澳洲公民(已放弃韩国籍),无兵役义务——团队兵役周期中活动连续性最高的一员" },
  { id: "lee-know", name: "李旻浩", en: "Lee Know", g: "skz", birth: "1998-10-25", place: "金浦 · 京畿道", lat: 37.62, lon: 126.72, tz: "Asia/Seoul",
    role: "主舞担当", mil: MIL.window(2026, 2028, "1998 年生,已进入法定入伍年龄窗口(截至 2026 年 10 月未官宣具体日期,2026 年 8 月仍随团回归)"), milYears: null,
    mil26: "另按韩国兵役制度,TA 已进入法定入伍年龄窗口(未官宣),团体节奏存在中断可能" },
  { id: "changbin", name: "徐彰彬", en: "Changbin", g: "skz", birth: "1999-08-11", place: "龙仁 · 京畿道", lat: 37.24, lon: 127.2, tz: "Asia/Seoul",
    role: "主说唱/制作人(3RACHA)", mil: MIL.none, mil26: "" },
  { id: "hyunjin", name: "黄铉辰", en: "Hyunjin", g: "skz", birth: "2000-03-20", ...SEOUL,
    role: "主舞/门面担当", mil: MIL.none, mil26: "" },
  { id: "han", name: "韩知城", en: "HAN", g: "skz", birth: "2000-09-14", place: "仁川 · 韩国", lat: 37.46, lon: 126.7, tz: "Asia/Seoul",
    role: "主说唱/制作人(3RACHA)", mil: MIL.none, mil26: "" },
  { id: "felix", name: "李龙馥", en: "Felix", g: "skz", birth: "2000-09-15", place: "悉尼 · 澳大利亚", lat: -33.87, lon: 151.21, tz: "Australia/Sydney",
    role: "主舞/说唱担当", mil: MIL.none, mil26: "澳洲公民,无韩国兵役义务——兵役周期内活动连续性最高的一员" },
  { id: "seungmin", name: "金升玟", en: "Seungmin", g: "skz", birth: "2000-09-22", ...SEOUL,
    role: "主唱担当", mil: MIL.none, mil26: "" },
  { id: "i-n", name: "梁精寅", en: "I.N", g: "skz", birth: "2001-02-08", place: "釜山 · 韩国", lat: 35.18, lon: 129.08, tz: "Asia/Seoul",
    role: "忙内/主唱担当", mil: MIL.none, mil26: "" },
  // ── KickFlip ──
  { id: "kyehoon", name: "Kyehoon", en: "Kyehoon", g: "kickflip", birth: "2004-09-16", place: "西归浦 · 济州", lat: 33.25, lon: 126.56, tz: "Asia/Seoul",
    role: "队长", mil: MIL.none, mil26: "" },
  { id: "amaru", name: "Amaru", en: "Amaru", g: "kickflip", birth: "2005-10-21", place: "东京 · 日本", lat: 35.68, lon: 139.69, tz: "Asia/Tokyo",
    role: "表演/主唱担当(日本籍)", mil: MIL.none, mil26: "日本籍,无韩国兵役义务" },
  { id: "donghwa", name: "Donghwa", en: "Donghwa", g: "kickflip", birth: "2006-03-11", ...SEOUL,
    role: "主舞担当", mil: MIL.none, mil26: "" },
  { id: "juwang", name: "Juwang", en: "Juwang", g: "kickflip", birth: "2006-05-02", ...SEOUL,
    role: "主唱担当", mil: MIL.none, mil26: "" },
  { id: "minje", name: "Minje", en: "Minje", g: "kickflip", birth: "2006-05-12", ...SEOUL,
    role: "主说唱担当", mil: MIL.none, mil26: "" },
  { id: "keiju", name: "Keiju", en: "Keiju", g: "kickflip", birth: "2006-10-04", place: "东京 · 日本", lat: 35.68, lon: 139.69, tz: "Asia/Tokyo",
    role: "表演/主唱担当(日本籍)", mil: MIL.none, mil26: "日本籍,无韩国兵役义务" },
  { id: "donghyeon", name: "Donghyeon", en: "Donghyeon", g: "kickflip", birth: "2007-03-13", place: "大邱 · 韩国", lat: 35.87, lon: 128.6, tz: "Asia/Seoul",
    role: "忙内/主唱担当", mil: MIL.none, mil26: "" },
  // ── 2PM ──
  { id: "jun-k", name: "金敏俊", en: "Jun.K", g: "2pm", birth: "1988-01-02", ...SEOUL,
    role: "主唱担当", mil: MIL.done(2018, 2020, "2018-05 现役入伍,2020-01 退伍"),
    mil26: "兵役早已完结,当前以音乐剧与个人音乐活动为主" },
  { id: "nichkhun", name: "尼坤", en: "Nichkhun", g: "2pm", birth: "1988-06-24", place: "洛杉矶 · 美国", lat: 34.05, lon: -118.24, tz: "America/Los_Angeles",
    role: "门面/副唱担当", mil: MIL.none, mil26: "泰国籍,无韩国兵役义务——泰国兵役亦已依法免除,活动从未中断" },
  { id: "taecyeon", name: "玉泽演", en: "Taecyeon", g: "2pm", birth: "1988-12-27", ...SEOUL,
    role: "说唱担当", mil: MIL.done(2017, 2019, "2017-09-04 现役入伍(放弃美国绿卡主动选择现役),2019-05 退伍"),
    mil26: "兵役早已完结,当前以演员活动为主" },
  { id: "wooyoung", name: "张佑荣", en: "Wooyoung", g: "2pm", birth: "1989-04-30", ...SEOUL,
    role: "主舞/主唱担当", mil: MIL.done(2018, 2020, "2018 现役入伍,2020-02-28 退伍"),
    mil26: "兵役早已完结,当前以音乐剧与个人活动为主" },
  { id: "junho", name: "李俊昊", en: "Junho", g: "2pm", birth: "1990-01-25", ...SEOUL,
    role: "主唱担当", mil: MIL.done(2019, 2021, "2019 入伍(因肩伤转社会服务),2021-03 退伍"),
    mil26: "兵役早已完结,演员事业处于稳定上升期" },
  { id: "chansung", name: "黄灿盛", en: "Chansung", g: "2pm", birth: "1992-02-11", ...SEOUL,
    role: "忙内/说唱担当", mil: MIL.done(2019, 2021, "2019-06-11 陆军入伍,2021-01-05 退伍"),
    mil26: "兵役早已完结,当前以演员活动为主" },
  // ── H.O.T. ──
  { id: "moon-hee-jun", name: "文熙俊", en: "Moon Hee-jun", g: "hot", birth: "1978-06-14", ...SEOUL,
    role: "队长", mil: MIL.done(2008, 2009, "2008 年入伍、2009 年退伍(精确日期公开资料不详)"),
    mil26: "兵役早已完结,以综艺与主持活动为主" },
  { id: "tony-an", name: "安胜浩", en: "Tony An", g: "hot", birth: "1978-06-07", ...SEOUL,
    role: "主唱担当", mil: MIL.done(2008, 2010, "国防宣传院服役近三年,2010-09-14 退伍"),
    mil26: "兵役早已完结,以综艺主持与企业经营活动为主" },
  { id: "jang-woo-hyuk", name: "张佑赫", en: "Jang Woo-hyuk", g: "hot", birth: "1978-05-08", place: "大邱 · 韩国", lat: 35.87, lon: 128.6, tz: "Asia/Seoul",
    role: "主舞担当", mil: MIL.done(2007, 2009, "2007-11-15 入伍,2009-12-18 退伍"),
    mil26: "兵役早已完结,以个人舞蹈企划与演出为主" },
  { id: "kangta", name: "安七炫", en: "Kangta", g: "hot", birth: "1979-10-10", ...SEOUL,
    role: "主唱担当", mil: MIL.done(2008, 2010, "2008-04-01 现役入伍,2010-02-19 退伍"),
    mil26: "兵役早已完结;长期担任 SM 内部理事级职务,公司经营与个人音乐并行" },
  { id: "lee-jae-won", name: "李在元", en: "Lee Jae-won", g: "hot", birth: "1980-04-05", ...SEOUL,
    role: "忙内/说唱担当", mil: MIL.done(2009, 2011, "2009-05 入伍,2011-03-07 退伍(团队最后)"),
    mil26: "兵役早已完结,以个人活动为主" },
  // ── Super Junior ──
  { id: "leeteuk", name: "利特", en: "Leeteuk", g: "sju", birth: "1983-07-01", ...SEOUL,
    role: "队长/主唱担当", mil: MIL.done(2012, 2014, "2012-10 现役入伍,2014-07 退伍"),
    mil26: "兵役早已完结,以队长身份主持团体活动并活跃于综艺" },
  { id: "heechul", name: "希澈", en: "Heechul", g: "sju", birth: "1983-07-10", ...SEOUL,
    role: "综艺担当", mil: MIL.done(2011, 2013, "2011-09 因腿伤转社会服务,2013-08 退伍"),
    mil26: "兵役早已完结,综艺与直播活动的高产期" },
  { id: "yesung", name: "艺声", en: "Yesung", g: "sju", birth: "1984-08-24", ...SEOUL,
    role: "主唱担当", mil: MIL.done(2013, 2015, "2013-05 社会服务,2015-05 退伍"),
    mil26: "兵役早已完结,OST 与音乐剧双线活跃" },
  { id: "shindong", name: "神童", en: "Shindong", g: "sju", birth: "1985-09-28", ...SEOUL,
    role: "主舞/综艺担当", mil: MIL.done(2015, 2016, "2015-03 现役入伍,2016-12 退伍"),
    mil26: "兵役早已完结,综艺主持与内容制作并行" },
  { id: "sungmin", name: "晟敏", en: "Sungmin", g: "sju", birth: "1986-01-01", ...SEOUL,
    role: "主唱/表演担当", mil: MIL.done(2015, 2016, "2015-03 现役入伍,2016-12 退伍"),
    mil26: "兵役早已完结,以音乐剧与个人活动为主" },
  { id: "eunhyuk", name: "银赫", en: "Eunhyuk", g: "sju", birth: "1986-04-04", ...SEOUL,
    role: "主舞/说唱担当", mil: MIL.done(2015, 2017, "2015-10 现役入伍,2017-07 退伍"),
    mil26: "兵役早已完结,舞台与综艺双线稳定输出" },
  { id: "donghae", name: "东海", en: "Donghae", g: "sju", birth: "1986-10-15", ...SEOUL,
    role: "主唱/表演担当", mil: MIL.done(2015, 2017, "2015-10 现役入伍,2017-07 退伍"),
    mil26: "兵役早已完结,个人音乐与海外粉丝活动并行" },
  { id: "siwon", name: "始源", en: "Siwon", g: "sju", birth: "1987-02-10", ...SEOUL,
    role: "门面/说唱担当", mil: MIL.done(2015, 2017, "2015-11 以义警入伍,2017-08 退伍"),
    wealthBand: "2000万–7000万",
    wealthFamily: "父亲为企业经营者(本人访谈中多次公开提及),家庭起点资产与资源托举显著,区间在团档基础上上浮",
    mil26: "兵役早已完结,演员事业与家族企业事务并行" },
  { id: "ryeowook", name: "厉旭", en: "Ryeowook", g: "sju", birth: "1987-06-21", ...SEOUL,
    role: "主唱担当", mil: MIL.done(2016, 2018, "2016-10 现役入伍,2018-07 退伍"),
    mil26: "兵役早已完结,OST、音乐剧与电台活动多线并行" },
  { id: "kyuhyun", name: "圭贤", en: "Kyuhyun", g: "sju", birth: "1988-02-03", ...SEOUL,
    role: "主唱担当", mil: MIL.done(2017, 2019, "2017-05 社会服务,2019-05 退伍"),
    mil26: "兵役早已完结,音乐剧头部主演与综艺固定班底双线发展" },
  // ── BIGBANG ──
  { id: "g-dragon", name: "权志龙", en: "G-Dragon", g: "bigbang", birth: "1988-08-18", ...SEOUL,
    role: "队长/制作人", mil: MIL.done(2018, 2019, "2018-02 现役入伍,2019-10 退伍"),
    y25: "2025 年个人专辑《Übermensch》回归,全球巡演与时尚资源全面重启", y26: "个人厂牌时代全面展开,时尚与音乐双线领跑",
    mil26: "兵役早已完结,个人厂牌活动为主" },
  { id: "top", name: "崔胜铉", en: "T.O.P", g: "bigbang", birth: "1987-11-04", ...SEOUL,
    role: "说唱/演技担当", mil: MIL.done(2017, 2018, "2017-02 入伍,2018-11 退伍"),
    mil26: "兵役早已完结,以影视与艺术收藏个人线为主" },
  { id: "taeyang", name: "东永裴", en: "Taeyang", g: "bigbang", birth: "1988-05-18", ...SEOUL,
    role: "主唱担当", mil: MIL.done(2018, 2019, "2018-03 现役入伍,2019-11 退伍"),
    mil26: "兵役早已完结,个人音乐与舞台活动稳定" },
  { id: "daesung", name: "姜大声", en: "Daesung", g: "bigbang", birth: "1989-04-26", ...SEOUL,
    role: "主唱担当", mil: MIL.done(2018, 2019, "2018-03 现役入伍,2019-11 退伍"),
    mil26: "兵役早已完结,以日本市场个人活动与内容创作为主" },
  // ── WINNER ──
  { id: "kim-jinwoo", name: "金秦禹", en: "Kim Jinwoo", g: "winner", birth: "1991-09-26", ...SEOUL,
    role: "门面/副唱担当", mil: MIL.done(2020, 2021, "2020-04 以社会服务要员入伍并完成服役"),
    mil26: "兵役已完结,个人演技与综艺线回温" },
  { id: "lee-seunghoon", name: "李昇勋", en: "Lee Seunghoon", g: "winner", birth: "1992-01-11", place: "釜山 · 韩国", lat: 35.18, lon: 129.08, tz: "Asia/Seoul",
    role: "主舞担当", mil: MIL.done(2020, 2021, "2020-04 以替代服务入伍并完成服役"),
    mil26: "兵役已完结,编舞企划与综艺双线活跃" },
  { id: "mino", name: "宋旻浩", en: "Mino", g: "winner", birth: "1993-03-30", ...SEOUL,
    role: "主说唱/制作人", mil: MIL.done(2023, 2026, "2023-03 以社会服务要员入伍;其服役合规性争议于 2026 年进入司法程序(公开报道)"),
    mil26: "服役相关争议处于司法程序中,个人活动节奏放缓" },
  { id: "kang-seungyoon", name: "姜昇润", en: "Kang Seungyoon", g: "winner", birth: "1994-01-21", place: "釜山 · 韩国", lat: 35.18, lon: 129.08, tz: "Asia/Seoul",
    role: "队长/主唱担当", mil: MIL.done(2023, 2024, "2023 年以社会服务要员入伍,2024-12-19 退伍"),
    mil26: "兵役已完结,队长线个人音乐企划重启" },
  // ── iKON ──
  { id: "jay", name: "金振焕", en: "Jay", g: "ikon", birth: "1994-02-07", ...SEOUL,
    role: "队长/主唱担当", mil: MIL.done(2023, 2025, "以社会服务要员入伍,2025-04 退伍(团队首位)"),
    mil26: "退伍归来即投入新专辑与巡演,个人线快速重启" },
  { id: "yunhyeong", name: "宋允亨", en: "Song Yunhyeong", g: "ikon", birth: "1995-02-08", ...SEOUL,
    role: "门面/副唱担当", mil: MIL.done(2024, 2026, "以现役入伍(第三步兵师团,晋升兵长),2026-02 退伍"),
    mil26: "2026 年 2 月退伍归队,演艺与舞台线重启" },
  { id: "bobby", name: "金知元", en: "Bobby", g: "ikon", birth: "1995-12-21", ...SEOUL,
    role: "主说唱担当", mil: MIL.done(2024, 2025, "2024-06-04 现役入伍,2025-12-03 退伍"),
    mil26: "退伍归来,说唱线个人企划与团队活动并行" },
  { id: "donghyuk", name: "金东赫", en: "DK", g: "ikon", birth: "1997-01-03", ...SEOUL,
    role: "主唱/表演担当", mil: MIL.window(2025, 2027, "1997 年生,已进入法定入伍年龄窗口(截至 2026 年 10 月公开信息不详)"),
    mil26: "已进入法定入伍年龄窗口(公开信息不详),完整体窗口存在不确定性" },
  { id: "june", name: "具俊会", en: "JUNE", g: "ikon", birth: "1997-03-31", ...SEOUL,
    role: "主唱担当", mil: MIL.done(2024, 2026, "以现役入伍,2025-11 退伍"),
    mil26: "退伍归来,声乐线个人活动重启" },
  { id: "chanwoo", name: "郑粲右", en: "Chanwoo", g: "ikon", birth: "1998-01-26", ...SEOUL,
    role: "忙内/演技担当", mil: MIL.done(2024, 2025, "以现役入伍,2025-11 退伍"),
    mil26: "退伍归来,演技与团队活动并行" },
];

const HOURS = ["00:30","02:30","04:30","06:30","08:30","10:30","12:30","14:30","16:30","18:30","20:30","22:30"];
const rand = () => HOURS[Math.floor(Math.random() * 12)];
const ideal = { security: 50, expression: 50, independence: 50, conflict: 50, novelty: 50 };


// 命理推算 MBTI 占位(仅卡片展示用,非公开资料;mbti_source_type=unknown)
function chartMbti(chart, profile) {
  const GAN = "甲丙戊庚壬";
  const e = GAN.includes(chart.dayMaster) ? "E" : "I";
  const gods = profile.tenGods;
  const val = (n) => gods.find((g) => g.name === n)?.value ?? 0;
  const s = (val("印星") + val("比劫")) >= (val("食伤") + val("财星")) ? "S" : "N";
  const t = (val("官杀") + val("印星")) >= (val("财星") + val("食伤")) ? "T" : "F";
  const j = val("官杀") >= val("食伤") ? "J" : "P";
  return e + s + t + j;
}

// 工作台排位接在现有 8 人之后
const { data: existing } = await supabase.from("celebrity_profiles").select("workspace_position").not("workspace_position", "is", null).order("workspace_position", { ascending: false }).limit(1);
let pos = (existing?.[0]?.workspace_position ?? 8) + 1;

for (const m of MEMBERS) {
  const G = GROUPS[m.g];
  // 时辰:已有则用,无则随机固化
  const { data: row } = await supabase.from("celebrity_profiles").select("birth_time").eq("id", m.id).maybeSingle();
  const hour = row?.birth_time || rand();
  const chart = buildBaziChart({ birthDate: m.birth, birthTime: hour, gender: "male", city: { id: m.id, name: m.place, lat: m.lat, lon: m.lon, tz: m.tz } });
  const report = buildStarBaziReport(chart);
  const profile = buildBaziLifeProfile(chart);
  const consult = buildConsultReport(chart, profile, report);
  const pillars = chart.pillars.map((p) => p.ganzhi);
  const badges = [`${chart.dayMaster}${profile.summary.dayElement}日主`, profile.summary.strength, `喜用 ${profile.summary.favorable.join(" · ")}`];
  const rendered = renderReport({ id: m.id, chart, profile, consult, group: G, member: m });
  const content = { ...rendered, heroPillars: pillars, heroBadges: badges };

  // ── 现实锚定 ──
  content.career.direction = `现实中,TA 是 ${G.label} 的${m.role}(${G.debut}出道,${{ txt: "Big Hit Music/HYBE", skz: "JYP Entertainment", kickflip: "JYP Entertainment", "2pm": "JYP Entertainment", svt: "Pledis Entertainment/HYBE", hot: "SM Entertainment", sju: "SM Entertainment", bigbang: "YG Entertainment", winner: "YG Entertainment", ikon: "YG Entertainment 出身(现 143 Entertainment)" }[m.g]})。命理上${badges[1]}之局、喜${profile.summary.favorable.join("")},团队定位与盘面特质互为印证;中远期在${m.g === "txt" ? "团体周期与个人企划" : "制作/表演/综艺"}方向持续深化。`;
  content.wealth.rangeRich = {
    content: `TA 所在的 ${G.label} 属${G.tier}档团体,长线财富量级落在 ${m.wealthBand ?? G.band} 区间——以团体专辑与巡演分成、版权及个人企划为结构底盘。${m.wealthFamily ?? ""}${G.label === "SEVENTEEN" ? "2024-2028 年成员分批兵役带来阶段性收入递延,但十周年周期的体量底盘稳固;" : ""}量级结合公开商业档位与命局结构估算,仅供娱乐参考,不构成投资建议。`,
    highlights: [m.wealthBand ?? G.band],
  };
  content.wealth.source = `以团体专辑与巡演分成、词曲/表演版权及个人代言为基石${m.g === "svt" ? ";兵役空白期收入递延但不损根基" : ""}`;

  // ── 大运文案重构:十神组合生成各异的第一句 + 事实锚点独立成句(上限3条) ──
  const ZHI_MAIN = { 子: "癸", 丑: "己", 寅: "甲", 卯: "乙", 辰: "戊", 巳: "丙", 午: "丁", 未: "己", 申: "庚", 酉: "辛", 戌: "戊", 亥: "壬" };
  const GAN_EL = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
  const POOL_GOOD = ["输出通道大开,顺势铺开版图", "贵人与资源同频,适合立旗杆项目", "状态上行,把基本功换成代表作", "聚人聚势,扩张要快但底盘要稳"];
  const POOL_NEUTRAL = ["结构重于速度,先把盘子理顺", "稳中有进,靠积累而非风口", "蓄势练内功的十年", "节奏平缓,适合补短板、结同盟"];
  const POOL_CAUTION = ["压力测试期,收缩战线保基本盘", "压力当头,防冒进与内耗", "负重上坡,扛过去位置就是 TA 的", "变数偏多,先稳结构再谈扩张"];
  const POOL_WEALTH = { "承压 ↓": ["现金流优先,降杠杆、清冗余", "防御为上,守住存量即是赢", "收紧口袋,避开一切担保与合伙陷阱"], "向好 ↑": ["可加大投入,配置长线资产", "收入结构升级的窗口,宜签长约", "变现通道打开,把声量换成合约"], "强劲 ↑↑": ["扩张窗口,商业杠杆可适度放开", "巅峰兑现期,大胆收割前期布局", "多方进账,资产规模台阶式上行"], "平稳 →": ["稳步积累,不贪快", "细水长流,重点在守住复利", "平淡中修渠,为下个周期蓄水"] };
  const debutYear = { txt: 2019, skz: 2018, kickflip: 2025, "2pm": 2008, svt: 2015, hot: 1996, sju: 2005, bigbang: 2006, winner: 2014, ikon: 2015 }[m.g] ?? 2015;
  const pick = (pool, gz) => pool[(gz.charCodeAt(0) + gz.charCodeAt(1)) % pool.length];

  const usedAnchors = new Set();
  for (const step of content.career.lifetime) {
    const mt = /(\d{4})\s*[–—-]\s*(\d{4})/.exec(step.years ?? "");
    const [ys, ye] = mt ? [Number(mt[1]), Number(mt[2])] : [9999, 0];
    const ganGod = tenGod(chart.dayMaster, step.ganzhi[0]);
    const zhiGod = tenGod(chart.dayMaster, ZHI_MAIN[step.ganzhi[1]] ?? "甲");
    const ganEl = GAN_EL[step.ganzhi[0]] ?? "土";
    const label = profile.summary.favorable.includes(ganEl) ? "喜用得力" : profile.summary.cautious.includes(ganEl) ? "忌神当值" : "闲神流转";
    const pool = label === "喜用得力" ? POOL_GOOD : label === "忌神当值" ? POOL_CAUTION : POOL_NEUTRAL;
    const anchors = [];
    if (ys <= debutYear && ye >= debutYear && !usedAnchors.has("debut")) { usedAnchors.add("debut"); anchors.push(`${debutYear} 年随 ${G.label} 出道——正应此运从练习生体系破土之势`); }
    if (m.mil?.type === "serving" || m.mil?.type === "done") {
      const from = m.mil.type === "done" ? m.mil.from : Number(/(\d{4})/.exec(m.mil.note)?.[1] ?? 2026);
      const to = m.mil.type === "done" ? m.mil.to : (Number(String(m.mil.to ?? "").match(/\d{4}/)?.[0] ?? 2028));
      if (ys <= to && ye >= from && !usedAnchors.has("mil")) { usedAnchors.add("mil"); anchors.push(`${m.mil.note}的空白期亦在此运(事实性休整),退伍后完整体重启再启高峰`); }
    }
    for (const ev of G.events ?? (G.peak ? [G.peak] : [])) {
      const [ef, et, en] = ev;
      if (ys <= et && ye >= ef && !usedAnchors.has(`ev${en.slice(0, 4)}`)) { usedAnchors.add(`ev${en.slice(0, 4)}`); anchors.push(en); }
    }
    if (m.mil?.type === "exempt" && ys <= 2024 && ye >= 2023) anchors.push(m.mil.note);
    step.note = `${ganGod}透干、${zhiGod}坐支,${label}——${pick(pool, step.ganzhi)}。` + anchors.slice(0, 3).map((a) => `${a}。`).join("");
  }
  for (const step of content.wealth.lifetime) {
    const ganGod = tenGod(chart.dayMaster, step.ganzhi[0]);
    const zhiGod = tenGod(chart.dayMaster, ZHI_MAIN[step.ganzhi[1]] ?? "甲");
    const pool = POOL_WEALTH[step.trend] ?? POOL_WEALTH["平稳 →"];
    step.note = `${ganGod}/${zhiGod}组合主财务象——${pick(pool, step.ganzhi)}。`;
  }

  // 流年 2025/2026 现实改写
  const setYear = (arr, year, patch) => { const y = arr.find((x) => x.year === year); if (y) Object.assign(y, patch); };
  setYear(content.career.years, 2025, { score: 66, action: m.y25 ?? G.y25 + "。" });
  setYear(content.career.years, 2026, {
    score: m.mil?.type === "done" ? 80 : (m.mil?.type === "serving" || /入伍|入营/.test(m.mil26 ?? "") ? 52 : 72),
    action: (m.y26 ?? G.y26) + (m.mil26 ? ";" + m.mil26 : "") + "。"
  });
  setYear(content.wealth.years, 2026, { score: m.mil?.type === "done" ? 78 : (/入伍|入营|在役/.test((m.y26 ?? "") + (m.mil26 ?? "")) ? 55 : 72),
    note: (/入伍|入营|在役/.test((m.y26 ?? "") + (m.mil26 ?? "")) ? "兵役空白期:收入递延结算,版权与结算照常流入" : "团体周期兑现年:巡演与专辑分成带来稳定增量") + (m.mil?.type === "done" ? ";退伍归来,代言与企划回温" : "") + "。" });

  // ── 建档(发布) + 内容入库(保留已有头像,upsert 前回读) ──
  const { data: prevRow } = await supabase.from("celebrity_profiles").select("portrait_url").eq("id", m.id).maybeSingle();
  const { error: pErr } = await supabase.from("celebrity_profiles").upsert({
    id: m.id, name: m.name, name_en: m.en, name_zh: m.name, role: `${G.label}成员-${m.name}`,
    tagline: `${G.label} ${m.role}`, description: G.desc, relationship_style: "", focus: "",
    mbti: chartMbti(chart, profile), mbti_source_type: "unknown", mbti_confidence: "low", birth_date: m.birth, birth_time: hour, birth_place: m.place,
    birth_lat: m.lat, birth_lon: m.lon, birth_tz: m.tz, gender: "male",
    three_pillars: pillars.slice(0, 3).join(" · "), traits: [], categories: { txt: ["韩国明星", "TXT", "HYBE"], svt: ["韩国明星", "SEVENTEEN", "HYBE"], skz: ["韩国明星", "Stray Kids", "JYP"], kickflip: ["韩国明星", "KickFlip", "JYP"], "2pm": ["韩国明星", "2PM", "JYP"], hot: ["韩国明星", "H.O.T.", "SM"], sju: ["韩国明星", "Super Junior", "SM"], bigbang: ["韩国明星", "BIGBANG", "YG"], winner: ["韩国明星", "WINNER", "YG"], ikon: ["韩国明星", "iKON", "YG"] }[m.g],
    ideal, portrait_url: prevRow?.portrait_url || "", published: true, enable_bazi: true, enable_mbti: true,
    match_count: 0, workspace_position: pos,
  }, { onConflict: "id" });
  if (pErr) { console.log(`✗ ${m.id} 建档失败: ${pErr.message}`); continue; }

  const { error: oErr } = await supabase.from("consult_overrides").upsert({ star_id: m.id, content, updated_at: new Date().toISOString() }, { onConflict: "star_id" });
  if (oErr) { console.log(`✗ ${m.id} 内容失败: ${oErr.message}`); continue; }
  console.log(`✓ ${m.name.padEnd(4)}(${m.id}) ${pillars.join(" ")} | ${badges.join("/")} | 时辰${hour}${row?.birth_time ? "(沿用)" : "(随机固化)"} | pos ${pos}`);
  pos += 1;
}
console.log("done");
