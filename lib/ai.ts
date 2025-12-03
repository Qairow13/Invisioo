// components/chat/ChatAI.ts
"use client";

export async function askAI(message: string): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    return "Не получилось связаться с ИИ 😢 Попробуйте ещё раз.";
  }

  const data = await res.json();
  return data.reply as string;
}
