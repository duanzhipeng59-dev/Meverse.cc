import SubscriptionPage from "../subscription-page";
import { chatGPTSignInPath } from "../chatgpt-auth";

export const dynamic = "force-static";

export default function SubscribePage() {
  return (
    <SubscriptionPage
      chatGPTUser={null}
      chatGPTSignInPath={chatGPTSignInPath("/subscribe?chatgpt_flow=1")}
    />
  );
}
