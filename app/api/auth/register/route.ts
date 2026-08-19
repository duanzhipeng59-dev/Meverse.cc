export function POST() {
  return Response.json({ error: "not_found" }, { status: 404 });
}
