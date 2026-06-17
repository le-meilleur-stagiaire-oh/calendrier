export function buildFinalHashtags(account, hashtagBank, mandatory) {
  const mand = (mandatory[account] || []);
  const all  = Object.values(hashtagBank[account] || {}).flat();
  const pool = [...new Set(all)].filter(t => !mand.map(m=>m.toLowerCase()).includes(t.toLowerCase()));
  if (mand.length >= 5) return mand.slice(0, 5);
  const needed = 5 - mand.length;
  return [...mand, ...[...pool].sort(() => Math.random() - .5).slice(0, needed)];
}

export async function generateCaption(subject, account, credits, voices, hashtagBank, mandatory, mentions) {
  const finalTags = buildFinalHashtags(account, hashtagBank, mandatory);
  const mention   = mentions[account] || "@oetkerhotels";

  const ACCOUNT_PROMPTS = {
    HDCER: `I need a caption in English and then in French for Hôtel du Cap-Eden-Roc.
The subject is: ${subject}
Tone guidelines:
Write in an elegant but simple way. Keep the language easy to read and natural, not sophisticated or formal. Avoid anything that feels pretentious or like we are showing off. The tone should feel close, warm, and direct, as if we are speaking to the audience.
Style guidelines:
* The first sentence must be super short and mega hooky because we actually see it without opening the caption
* Do not start with "At Hotel du Cap..."
* Maximum 5 sentences per language
* No hashtags
* Smooth, natural flow (not too many short broken sentences)
* Focus on atmosphere, feelings, and simple moments rather than luxury buzzwords
* Avoid repeating the exact same structure in English and French (adapt naturally)`,

    CSM: `I need a caption in English and then in French for Château Saint-Martin & Spa.
The subject is: ${subject}
Tone guidelines:
Write in an elegant but simple way. Keep the language easy to read and natural, not sophisticated or formal. Avoid anything that feels pretentious or like we are showing off. The tone should feel close, warm, and direct, as if we are speaking to the audience.
Style guidelines:
* Do not start with "At Chateau Saint-Martin..."
* The first sentence must be super short and mega hooky because we actually see it without opening the caption
* Maximum 5 sentences per language
* No hashtags
* Smooth, natural flow (not too many short broken sentences)
* Focus on atmosphere, feelings, and simple moments rather than luxury buzzwords
* Avoid repeating the exact same structure in English and French (adapt naturally)`,

    APG: `I need a caption in English and then in French for L'Apogée Courchevel.
The subject is: ${subject}
Tone guidelines:
Write in an elegant but simple way. Keep the language easy to read and natural, not sophisticated or formal. Avoid anything that feels pretentious or like we are showing off. The tone should feel close, warm, and direct, as if we are speaking to the audience.
Style guidelines:
* Maximum 5 sentences per language
* No hashtags
* Smooth, natural flow (not too many short broken sentences)
* Focus on atmosphere, feelings, and simple moments rather than luxury buzzwords
* Avoid repeating the exact same structure in English and French (adapt naturally)`,

    BB: `I need a caption in English and then in French for Beefbar Courchevel.
The subject is: ${subject}
Tone guidelines:
Write in an elegant but simple way. Keep the language easy to read and natural, not sophisticated or formal. I want to break the codes and dare more even if we are in a luxury environment. Avoid anything that feels pretentious or like we are showing off. The tone should feel close, warm, and direct, as if we are speaking to the audience with audacity to shock — let's break the barrier that way.
Style guidelines:
* First sentence must be short and hooky
* Do not start with "At Beefbar Courchevel..."
* Maximum 5 sentences per language
* No hashtags
* Smooth, natural flow (not too many short broken sentences)
* Focus on atmosphere, feelings, and simple moments rather than luxury buzzwords
* Avoid repeating the exact same structure in English and French (adapt naturally)`,
  };

  const accountInstructions = ACCOUNT_PROMPTS[account] || ACCOUNT_PROMPTS.HDCER;

  const suffix = [
    credits ? `${credits}\n\n—` : null,
    mention,
    "",
    finalTags.join(" "),
  ].filter(l => l !== null).join("\n");

  const prompt = `${accountInstructions}

ADDITIONAL RULES (apply to all):
- BANNED WORDS AND PHRASES: luxury, unique, unforgettable, magical, breathtaking, incredible, experience, world-class, prestigious, exceptional, exclusive, perfect, stunning, amazing, wonderful, paradise, dream, ultimate, unparalleled, exquisite, sunset, golden hour, sunrise, twilight, dusk, "as the sun sets", "as the day ends", "bathed in light", "flooded with light".
- DO NOT mention any time of day unless it is unambiguously the main subject.
- NO emojis. NO exclamation marks.
- "No hashtags" means do NOT write your own hashtags — but you MUST copy the exact suffix block below verbatim after the French caption.

OUTPUT FORMAT (copy exactly, including the — separators and the suffix block):

[English caption]

—

[French caption]

—

${suffix}

Output ONLY the caption text following this format exactly. No labels, no brackets, no explanation.`;

  try {
    const res  = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ prompt }) });
    const data = await res.json();
    return (data.text || "").trim();
  } catch {
    return `The mountain holds its breath at this hour.\n\n—\n\nLa montagne retient son souffle à cette heure.\n\n—\n\n${mention}\n\n${finalTags.join(" ")}`;
  }
}

export async function analyzeImageAndGenerate(imageUrl, imageBase64, account, credits, voices, hashtagBank, mandatory, mentions) {
  const visionPrompt = `You are a creative director for ultra-luxury hospitality.
Look at this image and identify the mood, the scene, the emotion it evokes.

Write a subject line in French for this image (5-10 words, magazine headline style).
The subject should capture the essence of the image, not just describe it literally.
IMPORTANT: Do NOT mention any time of day (sunset, sunrise, golden hour, twilight, dusk, dawn, evening, morning) unless it is unambiguously the main subject of the image.

Return ONLY valid JSON with a single key: {"subject": "le sujet en français"}`;

  let subject = "";
  try {
    const res  = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode:"vision", prompt: visionPrompt, imageUrl: imageUrl||null, imageBase64: imageBase64||null }),
    });
    const data = await res.json();
    if (!data.error) {
      const text = (data.text || "").trim();
      const m = text.match(/\{[\s\S]*?\}/);
      if (m) {
        try { subject = JSON.parse(m[0]).subject || ""; } catch {}
      }
      if (!subject) subject = text.replace(/^["']|["']$/g, "").split("\n")[0].trim();
    }
  } catch (e) {
    return { subject:"", caption:"", error: e.message };
  }

  if (!subject) return { subject:"", caption:"", error:"L'analyse de l'image n'a pas retourné de sujet." };

  const caption = await generateCaption(subject, account, credits, voices, hashtagBank, mandatory, mentions);
  return { subject, caption };
}
