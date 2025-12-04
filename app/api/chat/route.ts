// app/api/chat/route.ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 👈 положи ключ в .env.local
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // базовая проверка
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400 }
      );
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // или любой другой
      messages: [
        {
          role: "system",
          content:
            "Ты ИИ-ассистент сервиса Invisioo. " +
            "Помогаешь людям с инвалидностью ориентироваться в городе, " +
            "объясняешь значения значков доступности, подсказываешь, как пользоваться картой. " +
            "Отвечай кратко и дружелюбно на русском.",
        },
        ...messages,
      ],
      temperature: 0.3,
    });

    const answer = completion.choices[0]?.message;
    if (!answer) {
      throw new Error("Empty response from OpenAI");
    }

    return new Response(JSON.stringify({ message: answer }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return new Response(
      JSON.stringify({ error: "Chat API error" }),
      { status: 500 }
    );
  }
}
