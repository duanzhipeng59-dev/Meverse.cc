import { stars } from "../../myfate-data";
import CelebrityBrowser from "./celebrity-browser";

export default function CelebrityMatchWorkspace() {
  return (
    <div className="mf-workspace-content">
      <header className="mf-workspace-heading">
        <div>
          <span className="mf-kicker">明星正缘测试</span>
          <h1>这一刻，你想走近谁？</h1>
          <p>选择一位心动对象，通过关系情境测试，看看你们之间藏着怎样的吸引力。</p>
        </div>
        <div className="mf-workspace-meta">
          <span>✦</span>
          <strong>24 道关系情境</strong>
          <small>约 6 分钟完成</small>
        </div>
      </header>

      <CelebrityBrowser stars={stars} />

      <p className="mf-workspace-disclaimer">
        人物画像为娱乐化设定，仅用于互动测试，并非本人认证。
      </p>
    </div>
  );
}
