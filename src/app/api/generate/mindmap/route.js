import { NextResponse } from "next/server";
import { getLLM } from "@/lib/langchain";

export async function POST(req) {

  console.log("OPENAI KEY:", process.env.OPENAI_API_KEY);

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
You are generating a study mind map from a lecture transcript.

Return ONLY valid JSON.
Do not include markdown.
Do not include code fences.
Do not include explanations.

Use exactly this structure:
{
  "root": "Main Topic",
  "children": [
    {
      "label": "Branch Topic",
      "children": [
        { "label": "Subtopic 1" },
        { "label": "Subtopic 2" }
      ]
    }
  ]
}

Rules:
- Keep labels short
- Use concepts, not full sentences
- Capture the real hierarchy of the lecture
- Create 3 to 6 major branches if possible
- Each major branch can have 1 to 5 children
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

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Mind map generation error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to generate mind map" },
      { status: 500 }
    );
  }
}