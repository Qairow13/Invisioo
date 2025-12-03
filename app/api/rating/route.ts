// app/api/ratings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Те же id, что и в твоём ACCESS_CATEGORIES
const ALLOWED_CATEGORIES = [
  "wheelchair",
  "motor",
  "temporary",
  "intellectual",
  "vision",
  "hearing",
] as const;

type Category = (typeof ALLOWED_CATEGORIES)[number];

type DbRow = {
  category: Category;
  score: number;
};

// преобразуем список оценок -> статистика
function buildStats(rows: DbRow[]) {
  const map: Record<
    Category,
    { sum: number; count: number }
  > = {} as any;

  for (const row of rows) {
    if (!map[row.category]) {
      map[row.category] = { sum: 0, count: 0 };
    }
    map[row.category].sum += row.score;
    map[row.category].count += 1;
  }

  const result: Record<
    Category,
    { avg: number; count: number }
  > = {} as any;

  for (const cat of ALLOWED_CATEGORIES) {
    const stat = map[cat];
    if (stat) {
      result[cat] = {
        avg: stat.sum / stat.count,
        count: stat.count,
      };
    }
  }

  return result;
}

/**
 * GET /api/ratings?placeId=atakent_mall
 * -> { ratings: { wheelchair: { avg: 8.5, count: 3 }, ... } }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId");

  if (!placeId) {
    return NextResponse.json(
      { error: "placeId is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("place_ratings")
    .select("category, score")
    .eq("place_id", placeId);

  if (error) {
    console.error("Supabase GET error", error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const ratings = buildStats((data ?? []) as DbRow[]);
  return NextResponse.json({ ratings });
}

/**
 * POST /api/ratings
 * body: { placeId, category, score }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { placeId, category, score } = body as {
    placeId?: string;
    category?: Category;
    score?: number;
  };

  if (!placeId || !category || typeof score !== "number") {
    return NextResponse.json(
      { error: "placeId, category, score are required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "bad_category" }, { status: 400 });
  }

  if (score < 1 || score > 10) {
    return NextResponse.json({ error: "bad_score" }, { status: 400 });
  }

  const { error: insertError } = await supabase
    .from("place_ratings")
    .insert({ place_id: placeId, category, score });

  if (insertError) {
    console.error("Supabase INSERT error", insertError);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  // после вставки сразу отдадим свежую статистику по этому месту
  const { data, error } = await supabase
    .from("place_ratings")
    .select("category, score")
    .eq("place_id", placeId);

  if (error) {
    console.error("Supabase GET-after-insert error", error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const ratings = buildStats((data ?? []) as DbRow[]);
  return NextResponse.json({ ratings });
}
