// suggestions.js - High-speed AI Writing Assistant & Conflict Mediator
// Powered by Groq AI with graceful fallback to Google Gemini.

const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let groqClient = null;
let groqModel = 'openai/gpt-oss-20b';

let geminiClient = null;
let geminiModel = null;

function initAI() {
    // 1. Initialize Groq (Primary High-Speed AI Engine)
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && groqKey.trim() !== '' && groqKey !== 'your_new_groq_api_key') {
        try {
            groqClient = new Groq({ apiKey: groqKey });
            console.log(`[CollabAI AI Service] Groq AI initialized successfully with model ${groqModel}.`);
        } catch (err) {
            console.warn('[CollabAI AI Service] Groq initialization failed:', err.message);
        }
    } else {
        console.log('[CollabAI AI Service] Note: GROQ_API_KEY is not set in .env.');
    }

    // 2. Initialize Gemini (Secondary Fallback)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim() !== '' && geminiKey !== 'your-gemini-api-key') {
        try {
            geminiClient = new GoogleGenerativeAI(geminiKey);
            geminiModel = geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash' });
            console.log('[CollabAI AI Service] Gemini 2.0 Flash initialized as fallback.');
        } catch (err) {
            console.warn('[CollabAI AI Service] Gemini initialization failed:', err.message);
        }
    }
}

initAI();

// AI Writing Assistant — Streaming typo/grammar correction and text polish
async function getSuggestion(text, socket) {
    if (!text || text.trim().length === 0) return;

    // Check if any AI provider is available
    if (!groqClient && !geminiModel) {
        socket.emit('suggestion-error', {
            message: 'No AI API Key is configured in .env. Please set GROQ_API_KEY in .env to activate high-speed AI writing suggestions.'
        });
        return;
    }

    const prompt = `Fix any typos, grammar issues, or awkward phrasing in this document snippet. Only return the corrected text, nothing else, no explanations, no markdown formatting outside the text:\n\n${text}`;

    // Attempt Groq first
    if (groqClient) {
        try {
            const stream = await groqClient.chat.completions.create({
                model: groqModel,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional writing assistant. You output ONLY the corrected text, with no introductory or concluding remarks.'
                    },
                    { role: 'user', content: prompt }
                ],
                stream: true,
                temperature: 0.3,
            });

            for await (const chunk of stream) {
                const chunkText = chunk.choices[0]?.delta?.content || '';
                if (chunkText) {
                    socket.emit('suggestion-chunk', chunkText);
                }
            }

            socket.emit('suggestion-done');
            return;
        } catch (groqErr) {
            console.warn('[CollabAI AI Service] Groq suggestion failed, attempting Gemini fallback:', groqErr.message);
            // If Gemini is not available, emit error
            if (!geminiModel) {
                socket.emit('suggestion-error', { message: `Groq AI error: ${groqErr.message}` });
                return;
            }
        }
    }

    // Gemini Fallback
    if (geminiModel) {
        try {
            const result = await geminiModel.generateContentStream(prompt);
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                    socket.emit('suggestion-chunk', chunkText);
                }
            }
            socket.emit('suggestion-done');
        } catch (geminiErr) {
            console.error('[CollabAI AI Service] Gemini suggestion failed:', geminiErr.message);
            socket.emit('suggestion-error', { message: `AI suggestion error: ${geminiErr.message}` });
        }
    }
}

// Conflict mediator — detects semantic clashes between near-simultaneous edits
async function checkForConflict(textSnippet, io, roomId) {
    if (!groqClient && !geminiModel) return;

    const prompt = `Two different users just edited overlapping or nearby text in a shared document within a few seconds of each other. Here is the current text in that region:

"${textSnippet}"

Does this look like a real semantic conflict — duplicated words/sentences, or contradictory edits? Respond with ONLY raw JSON, no markdown, no explanation outside the JSON:
{"conflict": true or false, "suggestion": "a clean merged version of just this snippet, or empty string if no conflict"}`;

    if (groqClient) {
        try {
            const response = await groqClient.chat.completions.create({
                model: groqModel,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.2
            });

            const rawText = response.choices[0]?.message?.content?.trim() || '';
            const parsed = JSON.parse(rawText);

            if (parsed.conflict && parsed.suggestion) {
                io.to(roomId).emit('conflict-suggestion', {
                    original: textSnippet,
                    suggestion: parsed.suggestion
                });
            }
            return;
        } catch (err) {
            console.warn('[CollabAI Conflict Mediator] Groq check note:', err.message);
        }
    }

    if (geminiModel) {
        try {
            const result = await geminiModel.generateContent(prompt);
            const rawText = result.response.text().trim();
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return;
            const parsed = JSON.parse(jsonMatch[0]);

            if (parsed.conflict && parsed.suggestion) {
                io.to(roomId).emit('conflict-suggestion', {
                    original: textSnippet,
                    suggestion: parsed.suggestion
                });
            }
        } catch (err) {
            console.error('[CollabAI Conflict Mediator] Gemini check failed:', err.message);
        }
    }
}

module.exports = { getSuggestion, checkForConflict };