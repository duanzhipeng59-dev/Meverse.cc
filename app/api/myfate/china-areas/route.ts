import { getAreaChildren, resolveArea } from "../../../myfate-china-areas";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const resolve = params.get("resolve");
  if (resolve) {
    const area = resolveArea(resolve);
    if (!area) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ code: area.code, name: area.path.join(" "), lat: area.lat, lon: area.lon });
  }
  const code = params.get("code");
  return Response.json({ children: getAreaChildren(code) }, { headers: { "cache-control": "public, max-age=86400" } });
}
