import axios from "axios";
import { NextResponse } from "next/server";

const baseUrl = "https://api.assemblyai.com";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req) {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY; // ADDED: reads your API key from .env.local

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ASSEMBLYAI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const formData = await req.formData(); // ADDED: receives file from frontend
    const file = formData.get("file"); // ADDED

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer(); // ADDED: turn uploaded file into buffer
    const buffer = Buffer.from(arrayBuffer); // ADDED

    const headers = {
      authorization: apiKey,
    };

    // ADDED: Step 1, upload raw audio file to AssemblyAI
    const uploadRes = await axios.post(`${baseUrl}/v2/upload`, buffer, {
      headers: {
        ...headers,
        "Content-Type": "application/octet-stream",
      },
      maxBodyLength: Infinity,
    });

    const audioUrl = uploadRes.data.upload_url; // ADDED

    // ADDED: Step 2, request a transcription job
    const transcriptRes = await axios.post(
      `${baseUrl}/v2/transcript`,
      {
        audio_url: audioUrl,
        speech_models: ["universal-3-pro", "universal-2"],
        speaker_labels: true,
        language_detection: true,
        auto_chapters: true,
        auto_highlights: true,
      },
      { headers }
    );

    const transcriptId = transcriptRes.data.id; // ADDED

    // ADDED: Step 3, poll until transcript is completed
    while (true) {
      const pollingRes = await axios.get(
        `${baseUrl}/v2/transcript/${transcriptId}`,
        { headers }
      );

      const transcript = pollingRes.data;

      if (transcript.status === "completed") {
        return NextResponse.json({
          id: transcript.id,
          text: transcript.text,
          status: transcript.status,
          utterances: transcript.utterances || [],
          chapters: transcript.chapters || [],
          highlights: transcript.auto_highlights_result || null,
        });
      }

      if (transcript.status === "error") {
        return NextResponse.json(
          { error: transcript.error || "Transcription failed" },
          { status: 500 }
        );
      }

      await sleep(3000); // ADDED: wait 3 seconds before polling again
    }
  } catch (error) {
    console.error(
      "AssemblyAI route error:",
      error?.response?.data || error.message
    );

    return NextResponse.json(
      {
        error:
          error?.response?.data?.error ||
          error.message ||
          "Something went wrong",
      },
      { status: 500 }
    );
  }
}