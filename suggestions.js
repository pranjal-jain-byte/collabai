const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Personal typo/garbled-text correction — triggered after a pause in typing
async function getSuggestion(text, socket) {
    if (!text || text.trim().length === 0) return;

    try {
        const prompt = `Fix any typos, garbled text, or repeated characters in this document snippet. Only return the corrected text, nothing else, no explanation:\n\n${text}`;

        const result = await model.generateContentStream(prompt);

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                socket.emit('suggestion-chunk', chunkText);
            }
        }

        socket.emit('suggestion-done');

    } catch (err) {
        console.error('Suggestion request failed:', err.message);
        socket.emit('suggestion-error', { message: 'Suggestion failed' });
    }
}

// Conflict mediator — triggered when two users edit near the same spot within seconds
async function checkForConflict(textSnippet, io, roomId) {
    try {
        const prompt = `Two different users just edited overlapping or nearby text in a shared document within a few seconds of each other. Here is the current text in that region:

"${textSnippet}"

Does this look like a real semantic conflict — duplicated words/sentences, or contradictory edits (e.g. two people typing the same word, or rewriting the same sentence differently)? Respond with ONLY raw JSON, no markdown, no explanation outside the JSON:
{"conflict": true or false, "suggestion": "a clean merged version of just this snippet, or empty string if no conflict"}`;

        const result = await model.generateContent(prompt);
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
        console.error('Conflict check failed:', err.message);
    }
}

module.exports = { getSuggestion, checkForConflict };