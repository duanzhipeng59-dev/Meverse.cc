import { stars } from "../../myfate-data";
import CelebrityBrowser from "./celebrity-browser";

export default function CelebrityMatchWorkspace() {
  return (
    <div className="mf-workspace-content">
      <header className="mf-workspace-heading mf-workspace-heading-compact">
        <div>
          <p>选择一位心动对象，通过关系情境测试，看看你们之间藏着怎样的吸引力。</p>
        </div>
      </header>

      <CelebrityBrowser stars={stars} />

      <p className="mf-workspace-disclaimer">
        人物画像为娱乐化设定，仅用于互动测试，并非本人认证。
      </p>
    </div>
  );
}
