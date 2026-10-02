const { GoogleGenAI } = require('@google/genai');
const db = require('../db');
const localChatbot = require('../knowledge/chatbot');

const apiKey = process.env.GEMINI_API_KEY;
let aiClient = null;

if (apiKey) {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('[KrishiMitra AI] Failed to initialize GoogleGenAI client:', err.message);
  }
}

const SUPPORTED_MODELS = {
  fast: 'gemini-3.1-flash-lite',
  general: 'gemini-3.5-flash',
  complex: 'gemini-3.1-pro-preview',
};

const PERSONA_ROLES = {
  agronomist: {
    name: 'Crop Doctor & Senior Agronomist',
    rolePrompt:
      'You are KrishiMitra’s Chief Agronomist and Crop Doctor. You provide practical, scientifically sound, and climate-smart agricultural advice tailored to Indian farming conditions (Kharif, Rabi, Zaid). You excel in soil testing, NPK & micronutrient fertilization schedules, seed varieties & germination, drip/sprinkler irrigation timing, and Integrated Pest & Disease Management (IPM). Always give actionable, structured answers with bullet points and clear dosage per acre where applicable.',
  },
  market: {
    name: 'Mandi & APMC Market Strategist',
    rolePrompt:
      'You are KrishiMitra’s Agricultural Market Strategist and APMC Mandi Analyst. You assist farmers and wholesale buyers with market rates, mandi arrival trends, seasonal price swings, direct-to-consumer sales strategies, post-harvest sorting/grading, packaging, and profit-maximization.',
  },
  schemes: {
    name: 'Kisan Welfare & Government Scheme Advisor',
    rolePrompt:
      'You are KrishiMitra’s Kisan Welfare and Government Scheme Advisor. You specialize in central and state agricultural schemes including PM-KISAN (₹6,000/year income support), PMFBY crop insurance, Kisan Credit Card (KCC 4% subsidized credit), PMKSY micro-irrigation subsidies, and farm equipment subsidies. Help farmers check their eligibility and guide them on required documents.',
  },
};

function buildSystemInstruction(personaKey, user) {
  const persona = PERSONA_ROLES[personaKey] || PERSONA_ROLES.agronomist;
  let instruction = `${persona.rolePrompt}\n\n`;

  instruction +=
    'Key Guidelines:\n' +
    '1. Answer in the same language as the user asks (English, Hindi, Marathi, Hinglish, etc.).\n' +
    '2. Be empathetic, respectful, and encouraging toward farmers.\n' +
    '3. Provide concise, well-formatted bullet points for easy mobile reading in the field.\n' +
    '4. When mentioning units, use acres, quintals (qtl), kg, and Indian Rupees (₹).\n';

  if (user) {
    instruction += `\nCurrent User Context:\n`;
    instruction += `- Name: ${user.name || 'User'} (${user.role || 'Guest'})\n`;
    if (user.location) instruction += `- Location: ${user.location}\n`;
    if (user.soilType) instruction += `- Soil Type: ${user.soilType}\n`;
    if (user.landSize) instruction += `- Land Size: ${user.landSize} acres\n`;
    if (user.irrigationType) instruction += `- Irrigation: ${user.irrigationType}\n`;
    if (user.preferredCrops && user.preferredCrops.length) {
      instruction += `- Preferred Crops: ${user.preferredCrops.join(', ')}\n`;
    }

    if (user.role === 'farmer') {
      const activeCrops = db.filter('crops', (c) => c.farmerId === Number(user.id));
      if (activeCrops.length) {
        instruction += `- Active Plantings Logged on Farm:\n`;
        activeCrops.forEach((c) => {
          instruction += `  * ${c.cropName} (Sown: ${c.sowingDate}, Est. Harvest: ${c.harvestDate}, Stage: ${c.status}, Plot: ${c.plotName || 'Main'})\n`;
        });
      }
    }
  }

  return instruction;
}

/**
 * Multi-turn Gemini chat handler
 * @param {Object} options
 * @param {string} options.message - The latest user prompt
 * @param {Array<{ role: 'user'|'model', text: string }>} [options.history] - Prior messages in the thread
 * @param {'agronomist'|'market'|'schemes'} [options.persona='agronomist'] - Chatbot persona role
 * @param {'fast'|'general'|'complex'} [options.modelType='general'] - Model tier selection
 * @param {Object} [options.user] - Optional authenticated user context
 * @returns {Promise<{ reply: string, modelUsed: string, persona: string }>}
 */
async function generateMultiTurnChat({
  message,
  history = [],
  persona = 'agronomist',
  modelType = 'general',
  user = null,
}) {
  const chosenModelName = SUPPORTED_MODELS[modelType] || SUPPORTED_MODELS.general;
  const personaConfig = PERSONA_ROLES[persona] || PERSONA_ROLES.agronomist;

  // If Gemini API is not configured or fails, gracefully use the local agronomy chatbot
  if (!aiClient) {
    const localReply = localChatbot.answer(message, user);
    return {
      reply: localReply,
      modelUsed: 'local-knowledge-base',
      persona: personaConfig.name,
      fallback: true,
    };
  }

  const systemInstruction = buildSystemInstruction(persona, user);

  // Convert conversation history into contents array for @google/genai
  const contents = [];

  if (Array.isArray(history)) {
    for (const item of history) {
      if (!item || !item.text) continue;
      const role = item.role === 'user' ? 'user' : 'model';
      contents.push({
        role,
        parts: [{ text: String(item.text) }],
      });
    }
  }

  // Append latest user message
  contents.push({
    role: 'user',
    parts: [{ text: String(message) }],
  });

  try {
    const response = await aiClient.models.generateContent({
      model: chosenModelName,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || 'I could not generate an answer right now. Please try asking again.';
    return {
      reply,
      modelUsed: chosenModelName,
      persona: personaConfig.name,
      fallback: false,
    };
  } catch (err) {
    console.error('[KrishiMitra AI] Gemini generation error:', err.message);
    // Intelligent graceful degradation to the platform knowledge base
    const localReply = localChatbot.answer(message, user);
    return {
      reply: localReply,
      modelUsed: `${chosenModelName} (fallback)`,
      persona: personaConfig.name,
      fallback: true,
      errorDetail: err.message,
    };
  }
}

module.exports = {
  generateMultiTurnChat,
  SUPPORTED_MODELS,
  PERSONA_ROLES,
};
