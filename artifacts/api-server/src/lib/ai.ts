// 👇 kill TypeScript interference completely
// @ts-ignore
import GroqImport from "groq-sdk";

// force correct constructor (handles ESM/CommonJS mismatch)
const Groq: any = (GroqImport as any).default || GroqImport;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function getModelForPlan(plan: string): { provider: string; model: string } {
  const starterProvider = process.env.STARTER_PROVIDER || process.env.MODEL_PROVIDER || "groq";
  const proProvider = process.env.PRO_PROVIDER || process.env.MODEL_PROVIDER || "groq";
  const agencyProvider = process.env.AGENCY_PROVIDER || process.env.MODEL_PROVIDER || "groq";
  const modelName = process.env.AI_MODEL_NAME || "llama-3.3-70b-versatile";

  let provider = "groq";
  if (plan === "starter") provider = starterProvider;
  else if (plan === "pro") provider = proProvider;
  else if (plan === "agency") provider = agencyProvider;

  return { provider, model: modelName };
}

export interface PropertyInput {
  propertyTitle?: string | null;
  propertyType?: string | null;
  bedrooms?: string | null;
  bathrooms?: string | null;
  areaSqft?: string | null;
  location?: string | null;
  price?: string | null;
  amenities?: string | null;
  nearbyLandmarks?: string | null;
}

export interface GeneratedListing {
  propertyTitle: string;
  longDescription: string;
  shortDescription: string;
  socialCaption: string | null;
  failed: boolean;
}

function buildPropertyData(property: PropertyInput): string {
  return [
    property.propertyTitle && `Property Title: ${property.propertyTitle}`,
    property.propertyType && `Property Type: ${property.propertyType}`,
    property.location && `Location: ${property.location}`,
    property.price && `Price: ${property.price}`,
    property.bedrooms && `Bedrooms: ${property.bedrooms}`,
    property.bathrooms && `Bathrooms: ${property.bathrooms}`,
    property.areaSqft && `Area (sqft): ${property.areaSqft}`,
    property.amenities && `Amenities: ${property.amenities}`,
    property.nearbyLandmarks && `Nearby Landmarks: ${property.nearbyLandmarks}`,
  ].filter(Boolean).join("\n");
}

function buildPrompt(property: PropertyInput, outputMode: string, includeSocial: boolean): string {
  const propertyData = buildPropertyData(property);

  const socialSection = includeSocial
    ? "\n\n3. SOCIAL CAPTION (if enabled):\nA short, engaging but still professional caption."
    : "";

  const socialOutput = includeSocial
    ? "\nSOCIAL_CAPTION: [social caption here]"
    : "";

  return `You are a professional real estate copywriter.

Your task is to generate a clean, factual, and professional property listing description based ONLY on the provided data.

Rules:
- Do NOT invent or assume any information not provided.
- Do NOT use storytelling, emotional exaggeration, or luxury buzzwords.
- Keep tone professional, clear, and suitable for real estate portals.
- Use a structured paragraph format.
- Mention key details like property type, location, size, configuration, and important amenities.
- If certain fields are missing, simply ignore them. Do not fill gaps.

Output formats:

1. LONG DESCRIPTION:
A detailed, well-structured paragraph suitable for SEO and property listings${outputMode === "concise" ? " (80-120 words)" : " (200-300 words)"}.

2. SHORT DESCRIPTION:
A concise version (2–3 lines) suitable for listing platforms.${socialSection}

Input data:
${propertyData}

Generate output in clean structured text using EXACTLY this format:
LONG_DESCRIPTION: [long description here]
SHORT_DESCRIPTION: [short description here]${socialOutput}`;
}

function parseResponse(
  text: string,
  includeSocial: boolean
): { longDescription: string; shortDescription: string; socialCaption: string | null } {
  const longMatch = text.match(/LONG_DESCRIPTION:\s*([\s\S]*?)(?=SHORT_DESCRIPTION:|$)/);
  const shortMatch = text.match(/SHORT_DESCRIPTION:\s*([\s\S]*?)(?=SOCIAL_CAPTION:|$)/);
  const socialMatch = text.match(/SOCIAL_CAPTION:\s*([\s\S]*?)$/);

  return {
    longDescription: longMatch?.[1]?.trim() || text.slice(0, 600).trim(),
    shortDescription: shortMatch?.[1]?.trim() || text.slice(0, 150).trim(),
    socialCaption: includeSocial && socialMatch ? socialMatch[1].trim() : null,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callWithRetry(fn: () => Promise<string>, maxRetries = 4): Promise<string> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      const isRateLimit =
        err?.status === 429 ||
        err?.error?.type === "rate_limit_exceeded" ||
        String(err?.message || "").toLowerCase().includes("rate limit") ||
        String(err?.message || "").toLowerCase().includes("rate_limit");

      if (isRateLimit && attempt < maxRetries) {
        const waitMs = Math.pow(2, attempt) * 1000;
        console.warn(`Groq rate limit hit (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${waitMs}ms…`);
        await sleep(waitMs);
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

export async function generateListingDescription(
  property: PropertyInput,
  outputMode: string,
  includeSocial: boolean,
  userPlan: string
): Promise<GeneratedListing> {
  const { model } = getModelForPlan(userPlan);
  const prompt = buildPrompt(property, outputMode, includeSocial);

  const responseText = await callWithRetry(() =>
    groq.chat.completions
      .create({
        model: model || "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      })
      .then((c: any) => c.choices?.[0]?.message?.content || "")
  );

  const parsed = parseResponse(responseText, includeSocial);

  return {
    propertyTitle: property.propertyTitle || "Unnamed Property",
    ...parsed,
    failed: false,
  };
}
