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
You are generating a multiple-choice quiz from a lecture transcript for a student to self-test.
Return ONLY valid JSON.
Do not include markdown.
Do not include code fences.
Do not include explanations.

Use exactly this structure:
{
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "explanation": "Why this answer is correct"
    }
  ]
}

Rules:
- Generate between 5 and 15 questions depending on how much content there is
- Each question must have exactly 4 options
- The answer field must exactly match one of the options
- Explanations should be 1-2 sentences
- Cover the most important concepts from the lecture
- Vary the difficulty: include recall, comprehension, and application questions
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

    if (!Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { error: "Invalid response shape from model" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
