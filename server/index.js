const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Groq = require('groq-sdk');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/api/suggest-topics', async (req, res) => {
    const { category, customContext } = req.body;
    try {
        const prompt = customContext
            ? `Suggest 5 specific discussion topics for "${category}" based on context: "${customContext}".`
            : `Suggest 5 professional topics for "${category}".`;
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: `${prompt} Return ONLY JSON: {"topics": [{"title": "", "details": ""}]}` }],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" }
        });
        res.json(JSON.parse(completion.choices[0].message.content));
    } catch (e) { res.json({ topics: [] }); }
});

app.post('/api/dict', async (req, res) => {
    const { word } = req.body;
    try {
        const completion = await groq.chat.completions.create({
            messages: [{
                role: "user",
                content: `Explain the word "${word}". Return JSON: {"english": "Simple definition", "hinglish": "👉 ${word} matlab... (Explain concept simply)"}`
            }],
            model: "llama-3.1-8b-instant",
            response_format: { type: "json_object" }
        });
        res.json(JSON.parse(completion.choices[0].message.content));
    } catch (e) { res.status(500).send("Error"); }
});

app.post('/api/chat', async (req, res) => {
    const { topic, message, history, level, aiLength, mode } = req.body;
    const lengthInstr = aiLength === 'Concise' ? "1 sentence" : aiLength === 'Detailed' ? "3-4 sentences" : "2 sentences";
    const systemPrompt = `Role: ${mode}. Topic: ${topic}. Level: ${level}. Respond in first person. Length: ${lengthInstr}. ONLY English. No grammar help.`;
    try {
        const chatHistory = (history || []).map(msg => ({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.parts[0].text }));
        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: systemPrompt }, ...chatHistory, { role: "user", content: message }],
            model: "llama-3.1-8b-instant",
        });
        res.json({ text: completion.choices[0].message.content });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/feedback', async (req, res) => {
    const { history } = req.body;
    const userLines = history.filter(m => m.role === 'user').map(m => m.parts[0].text).join(" | ");
    if (!userLines || userLines.length < 5) {
        return res.json({
            grammarMistakes: [{ original: "N/A", corrected: "Talk more!", why: "Session short.", hinglishWhy: "Analysis ke liye aur kahein." }],
            scores: { fluency: 5, grammar: 5, completeness: 5, coherence: 5, accuracy: 5, confidence: 5, fillers: 5 }
        });
    }
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Linguistic Auditor. Return JSON ONLY." },
                { role: "user", content: `Audit: "${userLines}". Provide JSON: {"grammarMistakes": [{"original":"","corrected":"","why":"","hinglishWhy":""}], "scores": {"fluency":0,"grammar":0,"completeness":0,"coherence":0,"accuracy":0,"confidence":0,"fillers":0}}` }
            ],
            model: "llama-3.1-8b-instant",
        });
        let rawContent = completion.choices[0].message.content.trim();
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        res.json(JSON.parse(jsonMatch[0]));
    } catch (e) { res.status(500).json({ error: "Audit failed" }); }
});

// Use the port Render gives us, otherwise use 5000 for local testing
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Cognivo Backend Live on Port ${PORT}`);
});