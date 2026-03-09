import { ChatOpenAI } from "@langchain/openai";

export function getLLM() {
  return new ChatOpenAI({
    model: "gpt-4.1-mini", 
    temperature: 0.2,
    apiKey: process.env.OPENAI_API_KEY,
  });
}