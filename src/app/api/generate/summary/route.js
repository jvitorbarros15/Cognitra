import { NextResponse } from "next/server";
import { getLLM } from "@/lib/langchain";

export async function POST(req) {
  try {
    const { transcript } = await req.json();

    if (!transcript) {
      return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
    }

    const llm = getLLM();

    const prompt = `
You are generating a concise study summary from a lecture transcript.
Return ONLY valid JSON.
Do not include markdown.
Do not include code fences.
Do not include explanations.
Use exactly this structure:
{
  "title": "Short title for this lecture",
  "overview": "2-3 sentence high-level overview of the lecture",
  "keyPoints": [
    "Key point 1",
    "Key point 2",
    "Key point 3"
  ],
  "conclusion": "1-2 sentence takeaway or conclusion"
}

Rules:
- Keep it academic and clear
- keyPoints should have 4 to 8 items
- Each key point is one concise sentence
- Only return JSON

Transcript:
${transcript}
`;

    const response = await llm.invoke(prompt);

    let parsed;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      return NextResponse.json(
        { error: "Model did not return valid JSON", raw: response.content },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Summary generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate summary" },
      { status: 500 }
    );
  }
}