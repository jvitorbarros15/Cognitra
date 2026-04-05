import axios from "axios";
import { NextResponse } from "next/server";

const baseUrl = "https://api.assemblyai.com";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req) {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY; 

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ASSEMBLYAI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const formData = await req.formData(); 
    const file = formData.get("file"); 

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer); 

    const headers = {
      authorization: apiKey,
    };

    // upload raw audio file to AssemblyAI
    const uploadRes = await axios.post(`${baseUrl}/v2/upload`, buffer, {
      headers: {
        ...headers,
        "Content-Type": "application/octet-stream",
      },
      maxBodyLength: Infinity,
    });

    const audioUrl = uploadRes.data.upload_url; 

    
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

    const transcriptId = transcriptRes.data.id; 

    // poll until transcript is completed
    while (true) {
      const pollingRes = await axios.get(
        `${baseUrl}/v2/transcript/${transcriptId}`,
        { headers }
      );

      const transcript = pollingRes.data;

      if (transcript.status === "completed") {
        if (!transcript.text || transcript.text.trim() === "") {
          return NextResponse.json(
            { error: "No speech detected in the recording. Make sure your microphone is working and try speaking clearly." },
            { status: 422 }
          );
        }

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
        const isNoSpeech =
          transcript.error?.toLowerCase().includes("no spoken audio") ||
          transcript.error?.toLowerCase().includes("language_detection") ||
          transcript.error?.toLowerCase().includes("does not appear to contain audio") ||
          transcript.error?.toLowerCase().includes("transcoding failed");
        return NextResponse.json(
          {
            error: isNoSpeech
              ? "No speech detected in the recording. Make sure your microphone is working and try speaking clearly."
              : transcript.error || "Transcription failed",
          },
          { status: 422 }
        );
      }

      await sleep(3000); 
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