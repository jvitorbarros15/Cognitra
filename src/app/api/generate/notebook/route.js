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
You are generating detailed class notes from a lecture transcript for a university student.
Return ONLY valid JSON. Do not include markdown. Do not include code fences. Do not include explanations.

Use exactly this structure:
{
  "title": "Short descriptive title for these notes",
  "pages": [
    {
      "pageNumber": 1,
      "sections": [
        { "type": "heading", "level": 1, "text": "Section Title" },
        { "type": "paragraph", "blockId": "p-1-0", "text": "Paragraph text here." },
        { "type": "bullets", "blockId": "b-1-1", "items": ["item 1", "item 2", "item 3"] },
        { "type": "definition", "blockId": "d-1-2", "term": "Key Term", "definition": "The definition of the term." }
      ]
    }
  ]
}

Rules:
- Respond in the same language as the transcript
- Generate 2 to 4 pages depending on how much content there is
- Each page should have 6 to 12 sections
- Use level 1 headings for major topics and level 2 headings for subtopics
- Paragraphs summarize the key explanation; keep them to 2-4 sentences
- Bullets list related facts, steps, or examples (3-6 items per bullets block)
- Definitions capture key terms that were explained in the lecture
- blockId must be unique across ALL pages; format is: first letter of type + hyphen + pageNumber + hyphen + index within that page (e.g. "p-1-0", "b-1-1", "d-2-3")
- headings do NOT get a blockId field
- Distribute content meaningfully across pages — do not put everything on page 1
- Cover the most important concepts, definitions, and explanations from the lecture
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

    if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      return NextResponse.json(
        { error: "Invalid response shape from model" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Notebook generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate notebook" },
      { status: 500 }
    );
  }
}
