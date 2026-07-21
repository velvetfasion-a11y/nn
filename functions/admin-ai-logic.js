/** Shared Gemini admin-AI logic (local API + Cloud Functions). */

const DEFAULT_CHAT_MODEL = "gemini-3.5-flash";
const DEFAULT_IMAGE_MODEL = "gemini-3-pro-image";
const MAX_PRODUCTS = 100;
const MAX_ATTACHMENTS = 4;
const MAX_ACTIONS = 8;

function geminiKey() {
  return String(process.env.GEMINI_API_KEY || "").trim();
}

function modelUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}

async function callGemini(model, body) {
  const key = geminiKey();
  if (!key) {
    const error = new Error("GEMINI_API_KEY saknas");
    error.status = 503;
    throw error;
  }

  const response = await fetch(modelUrl(model), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message || `Gemini svarade med HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function callGeminiWithFallback(models, body) {
  const uniqueModels = [...new Set(models.filter(Boolean))];
  let lastError = null;

  for (const model of uniqueModels) {
    try {
      return { payload: await callGemini(model, body), model };
    } catch (error) {
      lastError = error;
      if (
        error?.status === 404 ||
        /model.*(?:not found|unsupported)|not found.*model/i.test(error?.message || "")
      ) {
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error("Ingen kompatibel Gemini-modell hittades");
}

function responseParts(payload) {
  return payload?.candidates?.[0]?.content?.parts || [];
}

function responseText(payload) {
  return responseParts(payload)
    .map((part) => part.text || "")
    .join("")
    .trim();
}

function extractJsonCandidate(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) return fenced.trim();
  const object = raw.match(/\{[\s\S]*\}/)?.[0];
  return (object || raw).trim();
}

function repairJsonText(text) {
  let out = String(text || "").trim();
  out = out.replace(/,(\s*[}\]])/g, "$1");
  out = out.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  out = out.replace(/^\uFEFF/, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
  return out;
}

function parseJsonResponse(text) {
  const candidate = extractJsonCandidate(text);
  if (!candidate) throw new Error("AI-svaret innehöll inte giltig JSON");

  const attempts = [candidate, repairJsonText(candidate)];
  let lastError = null;

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("AI-svaret innehöll inte giltig JSON");
}

async function repairAiJson(rawText, models) {
  const { payload } = await callGeminiWithFallback(models, {
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "Fix this into valid minified JSON only. " +
              'Required shape: {"reply":"...","actions":[...]}. ' +
              "Do not add markdown. Do not explain.\n\nBroken JSON:\n" +
              String(rawText || "").slice(0, 12000),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });
  return parseJsonResponse(responseText(payload));
}

function sanitizeProducts(products) {
  return (Array.isArray(products) ? products : [])
    .slice(0, MAX_PRODUCTS)
    .map((product) => ({
      id: String(product?.id || ""),
      name: String(product?.name || "").slice(0, 120),
      sku: String(product?.sku || "").slice(0, 60),
      category: String(product?.category || "").slice(0, 40),
      type: String(product?.type || "").slice(0, 40),
      description: String(product?.description || "").slice(0, 500),
      price: Number(product?.price) || 0,
      variants: product?.variants || {},
      images: Array.isArray(product?.images) ? product.images.slice(0, 8) : [],
    }));
}

function dataUrlPart(dataUrl) {
  const match = /^data:([^;]+);base64,([a-z0-9+/=\s]+)$/i.exec(String(dataUrl || ""));
  if (!match || !match[1].startsWith("image/")) return null;
  return {
    inlineData: {
      mimeType: match[1],
      data: match[2].replace(/\s/g, ""),
    },
  };
}

function chatSystemPrompt(products) {
  return `You are the secure Jamil Jamila shop-admin assistant.
Convert the administrator's natural-language request into safe structured product actions.

Return ONLY one valid compact JSON object. No markdown. No trailing commas. Escape all quotes inside strings.
Shape:
{"reply":"short confirmation or clarification","actions":[...]}

Allowed actions:
- {"type":"create_product","name":"...","category":"his|hers|kids|accessories","typeName":"Fysisk","description":"...","sku":"JJ-000","price":0,"variants":{"S":0,"M":0,"L":0,"XL":0},"attachmentIndices":[0],"generateImagePrompts":["..."]}
- {"type":"update_product","target":"exact product id, SKU, or name","changes":{"name":"...","category":"...","description":"...","sku":"...","price":0,"variants":{"S":0,"M":0,"L":0,"XL":0}}}
- {"type":"delete_product","target":"exact product id, SKU, or name"}
- {"type":"generate_product_images","target":"exact product id, SKU, or name","prompts":["front catalog view...","detail view..."],"replaceMain":false,"referenceAttachmentIndex":0}

Rules:
- Never invent an existing target. Use an exact id, SKU, or name from Current products.
- Only create a product if the user clearly says create/add/new product.
- Only delete when the user explicitly asks to delete/remove.
- For "change/update this product" or "different images for this product", use Focused product if present; otherwise match the attached photo to Current products.
- When user asks for different/new images for an existing product, return generate_product_images (not create_product). Keep prompts short (under 120 chars each), max 3 prompts.
- Keep generated image prompts photorealistic, luxury-fashion, full product visible, neutral studio background, no text or watermark.
- Product category must be his, hers, kids, or accessories.
- Clothing variants must be in this order: S, M, L, XL.
- attachmentIndices refer to the attached images in the current message, starting at 0.
- If required information is genuinely missing, return an empty actions array and ask one concise question.
- Keep reply under 180 characters. Keep the whole JSON under 3500 characters.

Current products:
${JSON.stringify(products)}`;
}

function normalizeAiResult(parsed) {
  const actions = Array.isArray(parsed?.actions)
    ? parsed.actions.filter((action) => action && typeof action.type === "string").slice(0, MAX_ACTIONS)
    : [];
  return {
    reply: String(parsed?.reply || "Klart.").slice(0, 1000),
    actions,
  };
}

export async function runAdminAiPrompt(body = {}) {
  const prompt = String(body?.prompt || "").trim();
  if (!prompt) {
    const error = new Error("Skriv en instruktion först");
    error.status = 400;
    throw error;
  }
  if (prompt.length > 5000) {
    const error = new Error("Instruktionen är för lång");
    error.status = 400;
    throw error;
  }

  const products = sanitizeProducts(body?.products);
  const attachments = (Array.isArray(body?.attachments) ? body.attachments : []).slice(
    0,
    MAX_ATTACHMENTS,
  );
  const parts = [
    {
      text: `${prompt}\n\nFocused product: ${JSON.stringify(body?.focusedProduct || null)}`,
    },
  ];
  attachments.forEach((attachment, index) => {
    const imagePart = dataUrlPart(attachment?.dataUrl);
    if (imagePart) {
      parts.push({
        text: `[Attachment ${index}: ${String(attachment?.name || "image").slice(0, 100)}]`,
      });
      parts.push(imagePart);
    }
  });

  const chatModels = [process.env.GEMINI_MODEL, DEFAULT_CHAT_MODEL, "gemini-flash-latest"];
  const { payload } = await callGeminiWithFallback(chatModels, {
    systemInstruction: { parts: [{ text: chatSystemPrompt(products) }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const raw = responseText(payload);
  let parsed;
  try {
    parsed = parseJsonResponse(raw);
  } catch (parseError) {
    console.warn("admin-ai JSON parse failed, repairing:", parseError?.message);
    parsed = await repairAiJson(raw, chatModels);
  }

  return normalizeAiResult(parsed);
}

export async function runAdminAiImage(body = {}) {
  const prompt = String(body?.prompt || "").trim();
  if (!prompt) {
    const error = new Error("En bildinstruktion krävs");
    error.status = 400;
    throw error;
  }
  if (prompt.length > 2500) {
    const error = new Error("Bildinstruktionen är för lång");
    error.status = 400;
    throw error;
  }

  const parts = [
    {
      text:
        "Create a photorealistic luxury fashion e-commerce product image. " +
        "Show the complete product, preserve garment design and proportions, use refined neutral lighting, " +
        "no text, logos added by the model, borders, or watermarks. " +
        prompt,
    },
  ];
  const reference = dataUrlPart(body?.referenceDataUrl);
  if (reference) parts.push(reference);

  const { payload, model } = await callGeminiWithFallback(
    [
      process.env.GEMINI_IMAGE_MODEL,
      DEFAULT_IMAGE_MODEL,
      "gemini-2.5-flash-image-preview",
      "gemini-3-pro-image-preview",
    ],
    {
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: String(process.env.GEMINI_IMAGE_ASPECT || "3:4"),
          imageSize: String(process.env.GEMINI_IMAGE_SIZE || "4K"),
        },
      },
    },
  );

  const imagePart = responseParts(payload).find((part) => part.inlineData || part.inline_data);
  const inline = imagePart?.inlineData || imagePart?.inline_data;
  if (!inline?.data) throw new Error("Bildmodellen returnerade ingen bild");
  const mime = inline.mimeType || inline.mime_type || "image/png";

  return {
    dataUrl: `data:${mime};base64,${inline.data}`,
    model,
  };
}
