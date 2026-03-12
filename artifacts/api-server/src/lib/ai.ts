import Groq from "groq-sdk";

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set");
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

function getModelForPlan(plan: string): { provider: string; model: string } {
  const starterProvider = process.env.STARTER_PROVIDER || process.env.MODEL_PROVIDER || "groq";
  const proProvider = process.env.PRO_PROVIDER || process.env.MODEL_PROVIDER || "groq";
  const agencyProvider = process.env.AGENCY_PROVIDER || process.env.MODEL_PROVIDER || "groq";
  const modelName = process.env.AI_MODEL_NAME || "llama-3.1-70b-versatile";

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
  area?: string | null;
  location?: string | null;
  price?: string | null;
  amenities?: string | null;
  nearbyLandmarks?: string | null;
  additionalNotes?: string | null;
}

export interface GeneratedListing {
  propertyTitle: string;
  longDescription: string;
  shortDescription: string;
  socialCaption: string | null;
}

function buildPrompt(property: PropertyInput, outputMode: string, includeSocial: boolean): string {
  const details = [
    property.propertyTitle && `Property: ${property.propertyTitle}`,
    property.propertyType && `Type: ${property.propertyType}`,
    property.bedrooms && `Bedrooms: ${property.bedrooms}`,
    property.bathrooms && `Bathrooms: ${property.bathrooms}`,
    property.area && `Area: ${property.area}`,
    property.location && `Location: ${property.location}`,
    property.price && `Price: ${property.price}`,
    property.amenities && `Amenities: ${property.amenities}`,
    property.nearbyLandmarks && `Nearby Landmarks: ${property.nearbyLandmarks}`,
    property.additionalNotes && `Additional Notes: ${property.additionalNotes}`,
  ].filter(Boolean).join("\n");

  const lengthInstruction = outputMode === "concise"
    ? "Write a short, structured professional paragraph (80-120 words)."
    : "Write a longer, descriptive professional paragraph (200-300 words).";

  const socialInstruction = includeSocial
    ? "\n\nSOCIAL_CAPTION: Write a single engaging social media caption (max 280 characters) for this property. No hashtags."
    : "";

  return `You are a professional real estate copywriter. Generate factual, structured listing descriptions based ONLY on the provided data. Do not exaggerate or add details not in the data.

PROPERTY DATA:
${details}

OUTPUT FORMAT (respond with EXACTLY this structure, no extra text):
LONG_DESCRIPTION: [${lengthInstruction}]
SHORT_DESCRIPTION: [Write a concise portal-ready description in 1-2 sentences, max 60 words.]${socialInstruction}`;
}

function parseResponse(text: string, includeSocial: boolean): { longDescription: string; shortDescription: string; socialCaption: string | null } {
  const longMatch = text.match(/LONG_DESCRIPTION:\s*([\s\S]*?)(?=SHORT_DESCRIPTION:|$)/);
  const shortMatch = text.match(/SHORT_DESCRIPTION:\s*([\s\S]*?)(?=SOCIAL_CAPTION:|$)/);
  const socialMatch = text.match(/SOCIAL_CAPTION:\s*([\s\S]*?)$/);

  return {
    longDescription: longMatch?.[1]?.trim() || text.slice(0, 500).trim(),
    shortDescription: shortMatch?.[1]?.trim() || text.slice(0, 100).trim(),
    socialCaption: includeSocial && socialMatch ? socialMatch[1].trim() : null,
  };
}

export async function generateListingDescription(
  property: PropertyInput,
  outputMode: string,
  includeSocial: boolean,
  userPlan: string
): Promise<GeneratedListing> {
  const { provider, model } = getModelForPlan(userPlan);

  const prompt = buildPrompt(property, outputMode, includeSocial);

  let responseText = "";

  if (provider === "openai") {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL_NAME || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });
    responseText = completion.choices[0]?.message?.content || "";
  } else {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: model || "llama-3.1-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });
    responseText = completion.choices[0]?.message?.content || "";
  }

  const parsed = parseResponse(responseText, includeSocial);

  return {
    propertyTitle: property.propertyTitle || "Unnamed Property",
    ...parsed,
  };
}
