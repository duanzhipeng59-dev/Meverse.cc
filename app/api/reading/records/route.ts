import { getSessionUser } from "../../auth/server";
import { listReadingReports, type ReadingSubject } from "../../../myfate-reading-server";
import { getPublishedStarBirths } from "../../../myfate-stars-server";
import { vedicCities } from "../../../myfate-cities";

// 命盘记录(双人合盘「从记录选」下拉):用户自填解读的 subject 去重 + 已有报告的发布明星。
// 明星按出生坐标匹配站点城市库最近城市(契约 cityId 必须在 vedicCities 内,坐标偏差可忽略)。
export type PersonRecordDto = { key: string; label: string; subject: ReadingSubject; source: "reading" | "star" };

const genderText = (gender: "male" | "female") => (gender === "male" ? "男" : "女");
const personLabel = (subject: ReadingSubject) => `${subject.name}（${subject.birthDate.slice(0, 4)}年 · ${genderText(subject.gender)}）`;

function nearestCity(lat?: number, lon?: number) {
  if (lat == null || lon == null) return vedicCities.find((city) => city.id === "seoul")!;
  let best = vedicCities[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const city of vedicCities) {
    const distance = (city.lat - lat) ** 2 + (city.lon - lon) ** 2;
    if (distance < bestDistance) { best = city; bestDistance = distance; }
  }
  return best;
}

export async function GET(request: Request) {
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  try {
    // reading_reports 未建表/查询失败时降级为空,不阻断明星部分
    const [rows, stars] = await Promise.all([
      listReadingReports(user.id).catch(() => []),
      getPublishedStarBirths(),
    ]);

    const records: PersonRecordDto[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      for (const subject of [row.subjectA, row.subjectB]) {
        if (!subject?.birthDate || !subject.birthTime) continue;
        const key = `reading:${subject.name}|${subject.gender}|${subject.birthDate}|${subject.birthTime}|${subject.cityId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        records.push({ key, label: personLabel(subject), subject, source: "reading" });
      }
    }
    for (const star of stars) {
      const key = `star:${star.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const city = nearestCity(star.lat, star.lon);
      // 契约性别只收 male/female;资料缺省按 female 兜底(现库明星均已填写)
      const gender: "male" | "female" = star.gender === "male" ? "male" : star.gender === "female" ? "female" : "female";
      const subject: ReadingSubject = {
        name: star.name,
        gender,
        birthDate: star.birthDate,
        birthTime: star.birthTime,
        cityId: city.id,
        cityName: city.name,
      };
      records.push({ key, label: personLabel(subject), subject, source: "star" });
    }
    return Response.json({ records });
  } catch (error) {
    console.error("Reading records failed", error);
    return Response.json({ error: "RECORDS_FAILED" }, { status: 500 });
  }
}
