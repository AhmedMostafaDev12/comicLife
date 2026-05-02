import { NextResponse } from 'next/server';
import { uploadAudio, createTranscript, waitForTranscript } from '../../../lib/assembly';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (!process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json({ error: 'AssemblyAI API Key not configured' }, { status: 500 });
    }

    // 1. Upload the audio to AssemblyAI
    // Convert Blob to Buffer for the upload
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const uploadUrl = await uploadAudio(buffer);

    // 2. Start transcription
    const transcriptId = await createTranscript(uploadUrl);

    // 3. Wait for transcription to complete (simple polling)
    const text = await waitForTranscript(transcriptId);

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Transcription Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
