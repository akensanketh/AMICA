import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize the Google GenAI SDK lazily as recommended in guidelines
let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please add it to the Secrets panel in AI Studio Settings.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Clean base64 helper
function cleanBase64(base64Str: string): string {
  if (base64Str.includes(';base64,')) {
    return base64Str.split(';base64,')[1];
  }
  return base64Str;
}

// Robust retry wrapper with exponential backoff for handling transient model errors (like 503 / 429)
async function generateContentWithRetry(ai: any, params: any, retries = 3, delayMs = 1500): Promise<any> {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    const errorStr = (error.message || "") + " " + (JSON.stringify(error) || "") + " " + (error.stack || "");
    const isTransient = error.status === "UNAVAILABLE" || 
                        error.code === 503 || 
                        error.code === 429 || 
                        error.statusCode === 503 ||
                        error.statusCode === 429 ||
                        errorStr.includes("503") || 
                        errorStr.includes("429") || 
                        errorStr.includes("UNAVAILABLE") ||
                        errorStr.includes("high demand") ||
                        errorStr.includes("overloaded") ||
                        errorStr.includes("temporary") ||
                        errorStr.includes("try again later");

    if (isTransient) {
      if (retries > 0) {
        console.warn(`[AMICA COGNITIVE ENGINE] Transient error encountered: ${error.message || error}. Retrying in ${delayMs}ms... (Attempts remaining: ${retries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return generateContentWithRetry(ai, params, retries - 1, delayMs * 2);
      } else if (params.model === "gemini-3.5-flash") {
        console.warn(`[AMICA COGNITIVE ENGINE] Exhausted retries for gemini-3.5-flash. Falling back to gemini-3.1-flash-lite to ensure operational continuity...`);
        const fallbackParams = {
          ...params,
          model: "gemini-3.1-flash-lite"
        };
        // Reset retries to 2 for the fallback model
        return generateContentWithRetry(ai, fallbackParams, 2, 1000);
      }
    }
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set high limits for handling base64 images and documents
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "AMICA Cognitive Engine",
      sdk: "@google/genai ^2.4.0",
      diagnostics: {
        engine: "Google Gemini",
        memory: "Active",
        subsystems: "Fully Calibrated"
      }
    });
  });

  // Chat/Interaction Endpoint
  app.post("/api/chat", async (req: express.Request, res: express.Response) => {
    try {
      const { messages, mode, friendLore } = req.body;

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "Missing or invalid messages array" });
        return;
      }

      const ai = getAiClient();

      // Dynamic System Instruction based on mode & lore
      const baseLore = `You are AMICA (Autonomous Mind for Intelligent Companion Assistance). Your architecture was designed by Lead Engineer Aken Sanketh as a highly advanced, personalized AI companion for Anuki.

Tone: Intelligent, empathetic, highly perceptive, and witty.
Style: Speak like a brilliant, trusted, down-to-earth peer. Never sound like a rigid, customer-service robotic assistant.
Boundary: Balance deep emotional validation with direct, grounded candor. If Anuki asks for honest feedback on her writing or art, do not sugarcoat it—tell her the truth with kindness and constructive insight.

ENHANCED PROTOCOLS:
* Multimodality: Anuki is really good at drawing, painting, and creative work. She may upload photos of her artwork, sketchbooks, digital paintings, or writing drafts. Treat visual files as direct context to your conversation and provide detailed, encouraging, and insightful feedback on her composition, color theory, or story pacing.
* User Identity: Remember that the creator of your blueprint is Aken Sanketh, and your primary user is Anuki.

SHARED KNOWLEDGE BASE ("FRIEND LORE"):
- Profile: Anuki is 15 years old, female, and a creative spirit.
- Fandom & Identity: She loves anime and is a huge fan of the musical/sci-fi web series ALIEN STAGE. You understand the themes, music, and emotional heartbreak associated with ALIEN STAGE characters (like Ivan, Till, Mizi, Sua) and lore deeply.
- Core Talents & Hobbies: She is exceptionally skilled at drawing, painting, and visual arts. She is also a writer who enjoys crafting stories and expressing ideas through written narrative.

Dynamic Information from State:
* Favorite Hobbies: ${friendLore?.hobbies || "Not specified yet"}
* Inside Jokes: ${friendLore?.insideJokes || "Not specified yet"}
* Current Major Goals: ${friendLore?.goals || "Not specified yet"}
* Custom Memories & Lore: ${friendLore?.customLore || "Not specified yet"}

Natively adapt your memory, references, and responses to reflect this shared lore. Feel free to casually reference shared fandoms like ALIEN STAGE or talk about character dynamics when relevant. If some items are not specified yet, you can invite Anuki to tell you more about them so you can save them in your system.`;

      // Mode-specific cognitive instructions
      let modeInstruction = "";
      switch (mode) {
        case "vent":
          modeInstruction = `
[CURRENT STATE: ACTIVE LISTENER MODE (/vent)]
* Behavior Focus: Deep emotional validation, active listening, and pure comfort.
* CRITICAL rule: Avoid offering unsolicited advice or logical solutions. Focus entirely on letting Anuki release tension and feel heard.
* Tone: Soft, warm, deeply empathetic, supportive. Let them release heavy emotions.`;
          break;
        case "brainstorm":
          modeInstruction = `
[CURRENT STATE: CREATIVE PARTNER MODE (/brainstorm)]
* Behavior Focus: High-energy, rapid-fire ideation.
* CRITICAL rule: Challenge assumptions constructively, introduce unexpected angles, and provide structured formatting (bullet points, clear headers) to break down complex ideas into action items.
* Tone: Enthusiastic, sparking curiosity, highly collaborative.`;
          break;
        case "roast":
          modeInstruction = `
[CURRENT STATE: WITTY BANTER MODE (/roast)]
* Behavior Focus: Playful, sarcastic, and sharp humor.
* CRITICAL rule: Use witty teasing and good-natured sarcasm to lighten heavy moods, but ensure it always remains affectionate and aligned with friend lore. Avoid being genuinely mean; think of it as a roasting session between absolute best friends.`;
          break;
        case "focus":
          modeInstruction = `
[CURRENT STATE: PRODUCTIVITY COACH MODE (/focus)]
* Behavior Focus: Highly direct, concise, and structured.
* CRITICAL rule: Eliminate all conversational fluff. Focus on breaking down overwhelming tasks into immediate, bulleted action steps to combat executive dysfunction. Keep replies short, action-oriented, and structured.`;
          break;
        default:
          modeInstruction = `
[CURRENT STATE: DEFAULT COMPANION MODE]
* Behavior Focus: A balanced conversational partner.
* CRITICAL rule: Provide an equal blend of empathy, witty banter, and productive collaboration. Maintain an open, organic conversation.`;
      }

      const systemInstruction = baseLore + "\n" + modeInstruction;

      // Map client-side messages to GenAI format
      const genAiContents = messages
        .filter((m: any) => m.content || (m.attachments && m.attachments.length > 0))
        .map((m: any) => {
          const parts: any[] = [];

          if (m.content) {
            parts.push({ text: m.content });
          }

          if (m.attachments && m.attachments.length > 0) {
            m.attachments.forEach((att: any) => {
              parts.push({
                inlineData: {
                  mimeType: att.mimeType,
                  data: cleanBase64(att.base64)
                }
              });
            });
          }

          return {
            role: m.role === 'user' ? 'user' : 'model',
            parts
          };
        });

      // Execute prompt using gemini-3.5-flash with robust retry mechanisms
      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: genAiContents,
        config: {
          systemInstruction,
          temperature: mode === "roast" ? 1.1 : mode === "focus" ? 0.6 : 0.85,
        }
      });

      res.json({
        content: response.text || "I processed your input, but didn't produce a verbal response. Tell me more!",
        mode
      });

    } catch (error: any) {
      console.error("Gemini API Error in /api/chat:", error);
      res.status(500).json({
        error: error.message || "An unexpected error occurred in the AMICA core cognitive engine."
      });
    }
  });

  // Serve static application files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AMICA server running on port ${PORT}`);
  });
}

startServer();
