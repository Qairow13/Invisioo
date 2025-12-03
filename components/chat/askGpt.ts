// components/chat/askGpt.ts
export async function askGpt(message: string): Promise<string> {
  try {
    const res = await fetch("/api/chat-gpt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      console.error("GPT API response not ok:", res.status);
      return "Не получилось связаться с ИИ 😔 Попробуйте ещё раз позже.";
    }

    const data = await res.json();

    if (!data.answer) {
      return "ИИ не смог ответить. Попробуйте задать вопрос по-другому 🙂";
    }

    return data.answer as string;
  } catch (e) {
    console.error("askGpt error:", e);
    return "Произошла ошибка при обращении к ИИ 😢";
  }
}
