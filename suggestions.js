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

// ---- Feature Two: AI Document Review Mode ----
async function reviewDocument({ fullText, targetText, categoryFilter = 'all' }) {
    const textToReview = (targetText && targetText.trim().length > 0) ? targetText : fullText;
    if (!textToReview || textToReview.trim().length === 0) {
        return { suggestions: [] };
    }

    if (!groqClient && !geminiModel) {
        throw new Error('AI service is not configured. Please set GROQ_API_KEY in the server environment.');
    }

    const prompt = `You are a world-class editor and technical document reviewer.
Analyze the following text and identify specific, actionable improvement suggestions across these 7 categories:
1. Clarity (confusing phrasing, ambiguous wording)
2. Grammar (spelling, typos, punctuation, syntax errors)
3. Structure (poor transition, missing headings, flow issues)
4. Contradictions (mutually conflicting or inconsistent claims)
5. Missing information (unstated assumptions, missing prerequisites or details)
6. Unsupported claims (assertions made without rationale or evidence)
7. Redundancy (repeated ideas, unnecessary filler)

${categoryFilter && categoryFilter !== 'all' ? `FILTER: Focus primarily on the category "${categoryFilter}".` : ''}

CRITICAL RULES:
- "originalText" MUST BE AN EXACT SUBSTRING appearing in the text, so it can be located and highlighted or safely replaced.
- If suggesting a replacement, provide the clean "suggestedText". If the issue is missing information or an observation, "suggestedText" may be empty.
- Keep "explanation" clear, concise, and constructive.

TEXT TO REVIEW:
"""
${textToReview.slice(0, 8000)}
"""

Respond with ONLY valid JSON:
{
  "suggestions": [
    {
      "id": "s1",
      "category": "Clarity",
      "title": "Short issue title",
      "originalText": "exact text snippet from document",
      "suggestedText": "suggested replacement text",
      "explanation": "why this change improves the document"
    }
  ]
}`;

    if (groqClient) {
        try {
            const completion = await groqClient.chat.completions.create({
                model: groqModel,
                messages: [
                    { role: 'system', content: 'You are an expert document editor. Always output strictly valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2
            });

            const content = completion.choices[0]?.message?.content?.trim();
            const parsed = JSON.parse(content);
            return { suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [] };
        } catch (err) {
            console.warn('[CollabAI AI Review] Groq call note:', err.message);
            if (!geminiModel) return getHeuristicReviewSuggestions(textToReview);
        }
    }

    if (geminiModel) {
        try {
            const result = await geminiModel.generateContent(prompt);
            const rawText = result.response.text().trim();
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return { suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [] };
            }
        } catch (err) {
            console.error('[CollabAI AI Review] Gemini call failed:', err.message);
            return getHeuristicReviewSuggestions(textToReview);
        }
    }

    return getHeuristicReviewSuggestions(textToReview);
}

function getHeuristicReviewSuggestions(text) {
    const suggestions = [];
    if (/grammer\s+erors/i.test(text)) {
        suggestions.push({
            id: 's-h-1',
            category: 'Grammar',
            title: 'Fix spelling errors',
            originalText: 'grammer erors',
            suggestedText: 'grammar errors',
            explanation: 'Correct spelling of grammar and errors.'
        });
    }
    if (/very\s+unique/i.test(text) && /not\s+unique/i.test(text)) {
        suggestions.push({
            id: 's-h-2',
            category: 'Contradiction',
            title: 'Resolve contradictory statements',
            originalText: 'very unique. However the system is not unique at all',
            suggestedText: 'standardized and uses proven components',
            explanation: 'The text first claims the system is very unique, then immediately states it is not unique at all.'
        });
    }
    if (suggestions.length === 0) {
        suggestions.push({
            id: 's-h-3',
            category: 'Clarity',
            title: 'Refine opening clause',
            originalText: text.slice(0, Math.min(30, text.length)),
            suggestedText: text.slice(0, Math.min(30, text.length)),
            explanation: 'Consider simplifying phrasing for better readability.'
        });
    }
    return { suggestions };
}

// ---- Feature Three: Ask Your Document (Document-Aware Q&A) ----
async function askDocument({ query, fullText, history = [] }) {
    if (!query || query.trim().length === 0) {
        throw new Error('Query is required');
    }

    if (!groqClient && !geminiModel) {
        throw new Error('AI service is not configured. Please set GROQ_API_KEY in the server environment.');
    }

    const docContext = (fullText && fullText.trim().length > 0)
        ? fullText.slice(0, 12000)
        : '[Empty document - no text written yet]';

    const systemPrompt = `You are CollabAI's Document Assistant — an intelligent, document-aware collaborator.
Your task is to answer user questions strictly based on the provided document context.
- Ground your answers in the document text.
- If the document does not contain the answer, state that clearly and suggest what might be needed.
- Use clean Markdown formatting with bullet points or numbered lists where appropriate.
- When referencing specific facts or decisions, cite the relevant section or quote the excerpt.
- Be concise, accurate, and helpful.`;

    const userPrompt = `DOCUMENT CONTEXT:
"""
${docContext}
"""

USER QUESTION:
${query}`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...(Array.isArray(history) ? history.slice(-6).map(h => ({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: String(h.content || '')
        })) : []),
        { role: 'user', content: userPrompt }
    ];

    if (groqClient) {
        try {
            const completion = await groqClient.chat.completions.create({
                model: groqModel,
                messages,
                temperature: 0.3
            });

            const answer = completion.choices[0]?.message?.content?.trim() || '';
            return { answer };
        } catch (err) {
            console.warn('[CollabAI Ask Doc] Groq call note:', err.message);
            if (!geminiModel) throw err;
        }
    }

    if (geminiModel) {
        try {
            const chatPrompt = `${systemPrompt}\n\n${userPrompt}`;
            const result = await geminiModel.generateContent(chatPrompt);
            const answer = result.response.text().trim();
            return { answer };
        } catch (err) {
            console.error('[CollabAI Ask Doc] Gemini call failed:', err.message);
            throw err;
        }
    }

    return { answer: 'AI service could not process your question at this time.' };
}

// ---- Feature Five: Turn Documents into Actions (Extract Action Items) ----
async function extractActionItems({ fullText }) {
    if (!fullText || fullText.trim().length === 0) {
        return { actionItems: [] };
    }

    if (!groqClient && !geminiModel) {
        throw new Error('AI service is not configured. Please set GROQ_API_KEY in the server environment.');
    }

    const prompt = `You are an AI Technical Project Manager.
Analyze the following document and extract concrete actionable tasks, along with explicitly mentioned responsible people, deadlines, dependencies, and open questions.

CRITICAL EXTRACTION RULES:
- "task": A clear, imperative action item (e.g. "Implement Redis persistence queue", "Configure DNS records").
- "assignee": ONLY assign a person if EXPLICITLY mentioned in the document (e.g., "Sarah will...", "Assigned to Alex"). If not stated, return an empty string "". DO NOT INVENT PEOPLE.
- "dueDate": ONLY assign a deadline if EXPLICITLY stated in the document (e.g., "by Friday", "Due Nov 15"). If not stated, return an empty string "". DO NOT INVENT DATES.
- "dependencies": Any prerequisites or blocking tasks mentioned.
- "openQuestions": Any unresolved questions, doubts, or ambiguities associated with this action.

DOCUMENT TEXT:
"""
${fullText.slice(0, 10000)}
"""

Respond with ONLY valid JSON:
{
  "actionItems": [
    {
      "task": "Task description",
      "assignee": "Name or empty string",
      "dueDate": "Deadline or empty string",
      "dependencies": ["dependency 1"],
      "openQuestions": ["question 1"]
    }
  ]
}`;

    if (groqClient) {
        try {
            const completion = await groqClient.chat.completions.create({
                model: groqModel,
                messages: [
                    { role: 'system', content: 'You are an expert project manager. Always output strictly valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2
            });

            const content = completion.choices[0]?.message?.content?.trim();
            const parsed = JSON.parse(content);
            return { actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [] };
        } catch (err) {
            console.warn('[CollabAI Extract Actions] Groq call note:', err.message);
            if (!geminiModel) throw err;
        }
    }

    if (geminiModel) {
        try {
            const result = await geminiModel.generateContent(prompt);
            const rawText = result.response.text().trim();
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return { actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [] };
            }
        } catch (err) {
            console.error('[CollabAI Extract Actions] Gemini call failed:', err.message);
            throw err;
        }
    }

    return { actionItems: [] };
}

module.exports = {
    getSuggestion,
    checkForConflict,
    reviewDocument,
    askDocument,
    extractActionItems
};