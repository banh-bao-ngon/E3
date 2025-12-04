// Vercel Serverless Function to proxy Gemini API requests
// This keeps the API key secure on the server side

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get API key from environment variable
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('GEMINI_API_KEY environment variable not set');
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Rate limiting could be added here if needed

        const systemPrompt = "You are a helpful assistant for medical professionals. Provide informative, accurate, and concise responses. When given a drug name, give me concise nursing information about [drug name], including its indications, how to administer it, common side effects, and when the patient should report to the doctor. You are supplementary only - always remind users to use clinical judgment. Do not provide direct medical advice. Answer questions about clinical protocols, drug interactions, and medical calculations based on provided information or public knowledge. Always cite sources when possible. Keep responses brief and focused.";

        const payload = {
            contents: [{
                parts: [{
                    text: systemPrompt + "\n\nUser question: " + message
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
            }
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API error:', data);
            return res.status(response.status).json({
                error: data.error?.message || 'API request failed'
            });
        }

        const candidate = data.candidates?.[0];
        let botResponse = "Sorry, I couldn't process that request. Please try again.";

        if (candidate && candidate.content?.parts?.[0]?.text) {
            botResponse = candidate.content.parts[0].text;
            botResponse += "\n\n*Remember: This is supplementary information only. Always use your clinical judgment and verify independently.*";
        }

        return res.status(200).json({ response: botResponse });

    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
