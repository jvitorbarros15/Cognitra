import { NextResponse } from "next/server";
import { getLLM } from "@/lib/langchain";

export async function POST(req) {
  try {
    const { transcript } = await req.json();

    if (!transcript) {
      return NextResponse.json(
        { error: "Missing transcript" },
        { status: 400 }
      );
    }

    const llm = getLLM();

    const prompt = `
You are generating flashcards from a lecture transcript for a student to study.
Return ONLY valid JSON.
Do not include markdown.
Do not include code fences.
Do not include explanations.

Use exactly this structure:
{
  "flashcards": [
    {
      "front": "Question or term",
      "back": "Answer or definition"
    }
  ]
}

Rules:
- Respond in the same language as the transcript
- Generate between 8 and 20 flashcards depending on how much content there is
- Front should be a concise question or key term
- Back should be a clear, short answer or definition (1-3 sentences max)
- Cover the most important concepts, definitions, and facts from the lecture
- Do not repeat the same concept twice
- Only return JSON

Transcript:
${transcript}
`;

    const response = await llm.invoke(prompt);

    let parsed;
    try {
      parsed = JSON.parse(response.content);
    } catch (parseError) {
      return NextResponse.json(
        {
          error: "Model did not return valid JSON",
          raw: response.content,
        },
        { status: 500 }
      );
    }

    // Validate the shape before sending back
    if (!Array.isArray(parsed.flashcards)) {
      return NextResponse.json(
        { error: "Invalid response shape from model" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Flashcard generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}