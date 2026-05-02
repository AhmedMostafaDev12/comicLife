import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '../../../lib/supabase-server';
import { parseStory } from '../../../lib/gemini';
import { buildPanelPrompt } from '../../../lib/prompts';
import { generatePanelImage, generateCharacterSheet } from '../../../lib/imagen';
import { enhanceStory } from '../../../lib/story-director';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { story, style, selectedCharacterIds = [] } = await req.json();
    if (!story || story.split(/\s+/).filter(Boolean).length < 50) {
      return NextResponse.json({ error: 'Write at least 50 words.' }, { status: 400 });
    }

    // 1. Handle Custom Style (Gemini Vision)
    let customStyleFragment = '';
    if (typeof style === 'string' && style.startsWith('custom:')) {
      const base64Data = style.split(',')[1];
      const visionModel = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });
      const visionResult = await visionModel.generateContent([
        { inlineData: { mimeType: 'image/webp', data: base64Data } },
        { text: 'Describe the artistic style of this image for a stable diffusion prompt. Focus on medium, lighting, and colors. Max 15 words.' },
      ]);
      customStyleFragment = visionResult.response.text().trim();
    }

    // 2. GET CHARACTER DESCRIPTIONS & VISUAL REFERENCES
    const initialCharacterContext: string[] = [];
    let userAvatarBase64: string | undefined = undefined;
    const extraCharactersBase64: Record<string, string> = {};

    if (user) {
      try {
        const path = `avatars/${user.id}.webp`;
        const { data: avatarData, error: avatarError } = await adminSupabase.storage.from('avatars').download(path);
        if (avatarData && !avatarError) {
          const buffer = await avatarData.arrayBuffer();
          userAvatarBase64 = Buffer.from(buffer).toString('base64');
        } else {
          const { data: profile } = await supabase.from('users').select('avatar_url').eq('id', user.id).maybeSingle();
          if (profile?.avatar_url && profile.avatar_url.startsWith('http')) {
            const imgRes = await fetch(profile.avatar_url);
            if (imgRes.ok) {
              const buffer = await imgRes.arrayBuffer();
              userAvatarBase64 = Buffer.from(buffer).toString('base64');
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch user avatar:", e);
      }

      const { data: profileData } = await supabase.from('users').select('character_description').eq('id', user.id).maybeSingle();
      if (profileData?.character_description) {
        initialCharacterContext.push(`Main Character: ${profileData.character_description}`);
      }
      
      if (selectedCharacterIds.length > 0) {
        const { data: extraChars } = await adminSupabase
          .from('characters')
          .select('id, name, description, avatar_url')
          .in('id', selectedCharacterIds)
          .eq('user_id', user.id);
        
        for (const c of extraChars || []) {
          initialCharacterContext.push(`${c.name}: ${c.description}`);
          
          if (c.avatar_url) {
            try {
              const path = `${c.id}.webp`;
              const { data, error } = await adminSupabase.storage.from('characters').download(path);
              
              if (data && !error) {
                const buffer = await data.arrayBuffer();
                extraCharactersBase64[c.name] = Buffer.from(buffer).toString('base64');
              } else {
                const imgRes = await fetch(c.avatar_url);
                if (imgRes.ok) {
                  const buffer = await imgRes.arrayBuffer();
                  extraCharactersBase64[c.name] = Buffer.from(buffer).toString('base64');
                }
              }
            } catch (e) {
              console.error(`Failed to fetch character ${c.name} avatar:`, e);
            }
          }
        }
      }
    }
    if (initialCharacterContext.length === 0) initialCharacterContext.push("a person");

    // 3. Enhance story via director layer, then parse into moments
    const enhancedStory = await enhanceStory(story);

    const storyContext = `
Available Characters as reference:
${initialCharacterContext.join('\n')}

Story:
${enhancedStory}
    `.trim();

    const parsingResult = await parseStory(storyContext);
    const moments = parsingResult.moments;
    
    const dnaCharacterDescriptions = Object.entries(parsingResult.visual_dna.character_traits).map(
      ([name, trait]) => `${name}: ${trait}`
    );

    // 4. Pass 1 — Generate styled character sheets from raw photos.
    // This converts photo → illustration in the target style while keeping the
    // face extremely close. Panels then use these as same-domain references.
    const effectiveStyle = style.startsWith('custom:') ? 'painterly' : style;

    let styledUserAvatar = userAvatarBase64;
    if (userAvatarBase64) {
      try {
        const userDesc = initialCharacterContext[0] || undefined;
        styledUserAvatar = await generateCharacterSheet(userAvatarBase64, effectiveStyle, userDesc);
        console.log('Character sheet generated for main user');
      } catch (e) {
        console.warn('Character sheet failed for user, falling back to raw photo:', (e as Error).message);
      }
    }

    const styledExtras: Record<string, string> = {};
    for (const [name, b64] of Object.entries(extraCharactersBase64)) {
      try {
        const desc = initialCharacterContext.find(c => c.startsWith(name))?.split(': ').slice(1).join(': ');
        styledExtras[name] = await generateCharacterSheet(b64, effectiveStyle, desc);
        console.log(`Character sheet generated for ${name}`);
      } catch (e) {
        console.warn(`Character sheet failed for ${name}, falling back to raw photo:`, (e as Error).message);
        styledExtras[name] = b64;
      }
    }

    // 5. Pass 2 — Generate panel 1 first (anchor), then remaining panels in parallel.
    // Panel 1 establishes the face identity; all subsequent panels use it as
    // an additional reference to prevent drift — but run concurrently for speed.
    const generatedComicId = uuidv4();

    const buildRefsForMoment = (moment: any) => {
      let referenceImage = styledUserAvatar;
      let rawPhoto = userAvatarBase64;
      for (const [name, b64] of Object.entries(styledExtras)) {
        if (moment.moment.toLowerCase().includes(name.toLowerCase())) {
          referenceImage = b64;
          rawPhoto = extraCharactersBase64[name];
          break;
        }
      }
      return { referenceImage, rawPhoto };
    };

    const generateOnePanel = async (moment: any, i: number, anchorBase64?: string) => {
      const prompt = buildPanelPrompt(
        moment.moment, style, dnaCharacterDescriptions,
        customStyleFragment, parsingResult.visual_dna.setting_dna
      );
      const { referenceImage, rawPhoto } = buildRefsForMoment(moment);
      const additionalRefs: { data: string }[] = [];
      if (rawPhoto && rawPhoto !== referenceImage) additionalRefs.push({ data: rawPhoto });
      if (anchorBase64) additionalRefs.push({ data: anchorBase64 });

      const imageBase64 = await generatePanelImage(
        prompt, referenceImage, 'image/webp',
        additionalRefs.length > 0 ? additionalRefs : undefined
      );

      const panelId = uuidv4();
      const buffer = Buffer.from(imageBase64, 'base64');
      const path = `panels/${generatedComicId}/${i}.webp`;
      await adminSupabase.storage.from('panels').upload(path, buffer, {
        contentType: 'image/webp', upsert: true
      });
      const { data: { publicUrl } } = adminSupabase.storage.from('panels').getPublicUrl(path);

      return {
        id: panelId, order: i, image_url: publicUrl,
        caption: moment.caption, bubbles: moment.bubbles || [],
        prompt_used: prompt,
        style: style.startsWith('custom:') ? 'custom' : style,
        mood: moment.emotion, comic_id: generatedComicId,
        _base64: imageBase64,
      };
    };

    // Panel 0 first — establishes identity anchor
    const panel0 = await generateOnePanel(moments[0], 0);
    const anchorBase64 = panel0._base64;

    // Remaining panels in parallel, all referencing panel 0
    const restPanels = moments.length > 1
      ? await Promise.all(moments.slice(1).map((m, idx) => generateOnePanel(m, idx + 1, anchorBase64)))
      : [];

    const panels = [panel0, ...restPanels].map(({ _base64, ...p }) => p);

    // 6. SAVE DRAFT COMIC + PANELS TO DB
    const { error: comicInsertError } = await supabase.from('comics').insert({
      id: generatedComicId,
      user_id: user.id,
      title: 'Draft Comic',
      story,
      style: style.startsWith('custom:') ? 'painterly' : style,
      is_draft: true,
      cover_url: panels[0].image_url
    });

    if (comicInsertError) {
      console.error('Comic insert failed:', comicInsertError);
      return NextResponse.json({ error: comicInsertError.message }, { status: 500 });
    }

    const panelsToInsert = panels.map(p => ({
      id: p.id,
      comic_id: generatedComicId,
      image_url: p.image_url,
      caption: p.caption,
      bubbles: p.bubbles,
      prompt: p.prompt_used,
      panel_index: p.order
    }));

    const { error: panelsInsertError } = await supabase.from('panels').insert(panelsToInsert);
    if (panelsInsertError) {
      console.error('Panels insert failed:', panelsInsertError);
      return NextResponse.json({ error: panelsInsertError.message }, { status: 500 });
    }

    return NextResponse.json({ comicId: generatedComicId, panels });
  } catch (error: any) {
    console.error("Pipeline Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
