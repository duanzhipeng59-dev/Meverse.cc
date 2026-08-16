import SubscriptionPage from "../subscription-page";
import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [chatGPTUser, params] = await Promise.all([
    getChatGPTUser(),
    searchParams,
  ]);

  return (
    <SubscriptionPage
      chatGPTUser={chatGPTUser}
      chatGPTSignInPath={chatGPTSignInPath("/subscribe?chatgpt_flow=1")}
      resumeChatGPTFlow={params.chatgpt_flow === "1"}
    />
  );
}
