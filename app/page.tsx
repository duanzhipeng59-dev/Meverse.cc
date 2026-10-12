import { redirect } from "next/navigation";

// 根路径直接进入发现页(应用默认首页)。
export default function RootPage() {
  redirect("/home/relationship-test");
}
