const API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export async function startVideoGeneration(
  prompt: string,
  referenceImageBase64: string,
  style: string
): Promise<string> {

  const url = `${BASE_URL}/models/veo-3.1-generate-preview:predictLongRunning`;

  const cleanPrompt = prompt.split('SCENE:')[1]?.split('CHARACTER LIKENESS:')[0] || prompt;
  const motionPrompt = `Animation of: ${cleanPrompt.trim()}. Art style: ${style}. Cinematic movement, high quality illustration style.`;

  console.log(`Starting Veo Generation...`);
  console.log(`Prompt: ${motionPrompt}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY!,
    },
    body: JSON.stringify({
      instances: [
        {
          prompt: motionPrompt,
          image: {
            bytesBase64Encoded: referenceImageBase64,
            mimeType: 'image/webp',
          },
        },
      ],
      parameters: {
        aspectRatio: '9:16',
        sampleCount: 1,
        durationSeconds: 6,
      },
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error('Veo Error Response:', responseText);
    throw new Error(`Veo Start Error (${response.status}): ${responseText || 'No response body'}`);
  }

  const data = JSON.parse(responseText);
  if (!data.name) {
    throw new Error(`Veo did not return an operation name. Response: ${responseText}`);
  }

  return data.name;
}

export interface VeoFilmShotOptions {
  prompt: string;
  startFrameBase64: string;
  startFrameMimeType?: string;
  durationSeconds?: 3 | 4 | 5 | 6;
  aspectRatio?: '9:16' | '16:9';
}

/**
 * Film-pipeline variant: takes a fully-cooked cinematic prompt + the keyframe
 * image (start frame) and returns the long-running operation id. No prompt
 * massaging — the director already wrote a motion-forward prompt.
 */
export async function startVeoFilmShot(opts: VeoFilmShotOptions): Promise<string> {
  const url = `${BASE_URL}/models/veo-3.1-generate-preview:predictLongRunning`;

  // Veo 3.1 only accepts a discrete set of durations: {4, 6, 8}.
  // Snap any requested value to the nearest valid option.
  const requestedDuration = Number(opts.durationSeconds);
  const fallback = Number.isFinite(requestedDuration) ? requestedDuration : 6;
  const allowed = [4, 6, 8];
  const safeDuration = allowed.reduce((best, v) =>
    Math.abs(v - fallback) < Math.abs(best - fallback) ? v : best
  );
  console.log(`[Veo] requested=${opts.durationSeconds} snapped=${safeDuration}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY!,
    },
    body: JSON.stringify({
      instances: [
        {
          prompt: opts.prompt,
          image: {
            bytesBase64Encoded: opts.startFrameBase64,
            mimeType: opts.startFrameMimeType ?? 'image/webp',
          },
        },
      ],
      parameters: {
        aspectRatio: opts.aspectRatio ?? '9:16',
        sampleCount: 1,
        durationSeconds: safeDuration,
      },
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error('Veo Error Response:', responseText);
    throw new Error(`Veo Start Error (${response.status}): ${responseText || 'No response body'}`);
  }

  const data = JSON.parse(responseText);
  if (!data.name) {
    throw new Error(`Veo did not return an operation name. Response: ${responseText}`);
  }

  return data.name;
}

export async function pollVideoOperation(operationId: string): Promise<string> {
  const url = `${BASE_URL}/${operationId}`;

  console.log('Polling Veo operation:', operationId);

  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    const response = await fetch(url, {
      headers: { 'x-goog-api-key': API_KEY! },
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Veo Poll Error (${response.status}): ${text}`);
    }

    const data = JSON.parse(text);

    if (data.done) {
      if (data.error) {
        throw new Error(`Veo Operation Failed: ${JSON.stringify(data.error)}`);
      }

      const videos = data.response?.generateVideoResponse?.generatedSamples
        ?? data.response?.generatedVideos
        ?? data.response?.videos;
      const video = videos?.[0];

      if (!video) {
        throw new Error(`No video in completed Veo response: ${JSON.stringify(data)}`);
      }

      return video.video?.uri ?? video.gcsUri ?? video.downloadUri;
    }

    console.log(`Veo generating... (attempt ${attempts + 1}/${maxAttempts})`);
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  throw new Error('Veo video generation timed out after 10 minutes');
}

export async function downloadVeoVideo(uri: string): Promise<Buffer> {
  let downloadUrl: string;
  if (uri.startsWith('http')) {
    const separator = uri.includes('?') ? '&' : '?';
    downloadUrl = `${uri}${separator}key=${API_KEY}`;
  } else {
    downloadUrl = `${BASE_URL}/${uri}?alt=media&key=${API_KEY}`;
  }

  const response = await fetch(downloadUrl);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to download video (${response.status}): ${text}`);
  }

  return Buffer.from(await response.arrayBuffer());
}