import { NextResponse } from "next/server";
import OpenAI from "openai";
import { VACANCIES } from "@/app/vacancies/vacanciesData";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// типы для тела запроса
type ChatBody = {
  message: string;
};

/* ------------ простая логика по вакансиям ------------ */

type AccessCategory =
  | "wheelchair"
  | "motor"
  | "temporary"
  | "intellectual"
  | "vision"
  | "hearing";

function detectCategory(text: string): AccessCategory | null {
  const q = text.toLowerCase();

  if (q.includes("коляс")) return "wheelchair";
  if (q.includes("опорно") || q.includes("ноги") || q.includes("двигат"))
    return "motor";
  if (q.includes("времен") || q.includes("травм")) return "temporary";
  if (q.includes("интеллект") || q.includes("когнит")) return "intellectual";
  if (q.includes("зрение") || q.includes("слабовид")) return "vision";
  if (q.includes("слух") || q.includes("глух") || q.includes("слабослыш"))
    return "hearing";

  return null;
}

function buildVacancyAnswer(
  text: string
): string | null {
  const q = text.toLowerCase();

  const asksJobs =
    q.includes("работ") || q.includes("ваканс") || q.includes("job");

  if (!asksJobs) return null;

  const category = detectCategory(q);

  const suitable = category
    ? VACANCIES.filter((v) => v.supports.includes(category))
    : VACANCIES;

  if (suitable.length === 0) {
    return "Пока у нас нет подходящих вакансий под вашу категорию, но вы можете заглянуть во вкладку «Вакансии» на сайте.";
  }

  const top = suitable.slice(0, 3);
  const list = top
    .map(
      (v, i) =>
        `${i + 1}. ${v.title} — ${v.salary} (${v.place}).`
    )
    .join("\n");

  let intro = "";

  if (category === "wheelchair") {
    intro =
      "Вот несколько вакансий, которые могут подойти человеку на коляске:\n\n";
  } else if (category === "vision") {
    intro =
      "Вот вакансии, которые чаще всего можно адаптировать под нарушение зрения:\n\n";
  } else if (category === "hearing") {
    intro =
      "Подобрала вакансии, где минимум звонков и больше работы через текст:\n\n";
  } else if (category) {
    intro = "С учётом вашей категории, вот что могу предложить:\n\n";
  } else {
    intro =
      "Вот вакансии, которые сейчас есть на Invisioo. Если напишете свою категорию инвалидности, смогу сузить список:\n\n";
  }

  return (
    intro +
    list +
    "\n\nПолный список вы можете посмотреть во вкладке «Вакансии»."
  );
}

/* ------------ основной обработчик ------------ */

export async function POST(req: Request) {
  const body = (await req.json()) as ChatBody;
  const userText = body.message?.trim();

  if (!userText) {
    return NextResponse.json(
      { reply: "Я не получил вопрос. Напиши, пожалуйста, ещё раз 😊" },
      { status: 200 }
    );
  }

  // 1) сначала пробуем сами подобрать вакансии
  const vacancyReply = buildVacancyAnswer(userText);
  if (vacancyReply) {
    return NextResponse.json({ reply: vacancyReply }, { status: 200 });
  }

  // 2) если это не запрос про вакансии — спрашиваем GPT
  try {
    const systemPrompt = `
Ты — ИИ-ассистент сервиса Invisioo.

Задача:
- Помогать людям с инвалидностью с вопросами о доступности мест и поиске работы.
- Пользователь уже видит приветствие в интерфейсе, поэтому НЕ нужно писать "привет", "здравствуйте" и не нужно представляться. Сразу отвечай по сути.
- Отвечай коротко, понятно и по-доброму.
- Если человек говорит о своей категории инвалидности и просит подсказать работу, дай общие рекомендации (какие типы ролей могут подойти) и предложи посмотреть список вакансий во вкладке "Вакансии" сайта Invisioo.

Формат ответа:
- максимум 3–5 предложений
- без лишних эмодзи (1–2 допустимо).
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
      temperature: 0.4,
    });

    const reply =
      completion.choices[0]?.message?.content ??
      "Кажется, у меня не получилось ответить. Попробуй переформулировать вопрос 🙏";

    return NextResponse.json({ reply }, { status: 200 });
  } catch (e) {
    console.error("Chat API error:", e);
    return NextResponse.json(
      {
        reply:
          "Что-то пошло не так при обращении к ИИ. Попробуйте ещё раз чуть позже 🙏",
      },
      { status: 200 }
    );
  }
}
