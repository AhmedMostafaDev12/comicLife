const API_KEY = process.env.ASSEMBLYAI_API_KEY;

export async function uploadAudio(audioData: Buffer | Blob): Promise<string> {
  const response = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': API_KEY!,
      'Content-Type': 'application/octet-stream'
    },
    body: audioData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`AssemblyAI Upload Error: ${error.error}`);
  }

  const data = await response.json();
  return data.upload_url;
}

export async function createTranscript(audioUrl: string): Promise<string> {
  const response = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': API_KEY!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: audioUrl
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`AssemblyAI Transcript Creation Error: ${error.error}`);
  }

  const data = await response.json();
  return data.id;
}

export async function getTranscriptResult(transcriptId: string): Promise<any> {
  const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
    method: 'GET',
    headers: {
      'Authorization': API_KEY!
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`AssemblyAI Polling Error: ${error.error}`);
  }

  return response.json();
}

/**
 * Polls the transcript result until it is completed or failed.
 */
export async function waitForTranscript(transcriptId: string): Promise<string> {
  let result = await getTranscriptResult(transcriptId);
  
  while (result.status === 'queued' || result.status === 'processing') {
    await new Promise(resolve => setTimeout(resolve, 3000));
    result = await getTranscriptResult(transcriptId);
  }

  if (result.status === 'error') {
    throw new Error(`AssemblyAI Transcription Failed: ${result.error}`);
  }

  return result.text;
}
