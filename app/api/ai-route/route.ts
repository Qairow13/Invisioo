import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profile, from, to, place } = body;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const profileLabel =
      profile === "wheelchair"
        ? "человек на инвалидной коляске"
        : profile === "vision"
        ? "человек с нарушением зрения"
        : profile === "hearing"
        ? "человек с нарушением слуха"
        : "человек с особыми потребностями";

    const prompt = `
Ты — ассистент по инклюзивной навигации в городе Алматы.
Нужно предложить максимально безопасный, удобный маршрут для: ${profileLabel}.

Исходные координаты пользователя: ${JSON.stringify(from)}
Цель: ${JSON.stringify(to)}
Место: ${place?.name || "Неизвестно"}
Характеристики места: ${(place?.details || []).join(", ")}

Учитывай:
- минимум лестниц и высоких бордюров
- ровные тротуары
- наличие пандусов и лифтов (если указаны)
- освещение и безопасность по ощущениям
- предпочтительно спокойные улицы

Ответ верни СТРОГО в JSON-формате без пояснений, вот структура:
{
  "description": "Общее текстовое описание маршрута простым понятным языком (2-6 предложений)",
  "steps": [
    "Шаг 1...",
    "Шаг 2...",
    "Шаг 3..."
  ]
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = {
        description: text,
        steps: [],
      };
    }

    return NextResponse.json(json);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to generate route" },
      { status: 500 }
    );
  }
}
