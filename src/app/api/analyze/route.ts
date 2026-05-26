import { NextResponse } from "next/server";
import { segmentChineseText } from "@/lib/segmenter";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 500_000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: unknown };
    const text = typeof body.text === "string" ? body.text : "";

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Bitte füge zuerst chinesischen Text ein." },
        { status: 400 },
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: "Der Text ist für dieses MVP noch zu lang. Bitte teste einen kleineren Ausschnitt." },
        { status: 413 },
      );
    }

    return NextResponse.json({ tokens: segmentChineseText(text) });
  } catch {
    return NextResponse.json(
      { error: "Der Text konnte nicht analysiert werden." },
      { status: 500 },
    );
  }
}
