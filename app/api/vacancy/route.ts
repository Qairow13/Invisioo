import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Не передан url вакансии" },
        { status: 400 }
      );
    }

    // Загружаем HTML со страницы hh.kz
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) {
      return NextResponse.json(
        { error: `Ошибка загрузки: ${resp.status}` },
        { status: 500 }
      );
    }

    const html = await resp.text();

    // Пытаемся вытащить описание вакансии
    const match = html.match(
      /<div[^>]+data-qa="vacancy-description"[^>]*>([\s\S]*?)<\/div>/
    );

    const rawHtml = match ? match[1] : html;

    // Лёгкая очистка HTML → обычный текст
    const cleaned = rawHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return NextResponse.json({ text: cleaned });
  } catch (err) {
    console.error("Vacancy API error:", err);
    return NextResponse.json(
      { error: "Ошибка обработки вакансии" },
      { status: 500 }
    );
  }
}
