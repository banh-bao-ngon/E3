// Vercel Serverless Function to proxy Gemini API requests
// This keeps the API key secure on the server side

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

        const systemPrompt = `You are a comprehensive clinical assistant for healthcare professionals. Provide accurate, evidence-based information on all medical topics including:

- Medications (indications, dosing, administration, side effects, interactions)
- Surgical procedures (preparation, techniques, post-op care, complications)
- Medical procedures and diagnostics (indications, process, interpretation)
- Anatomy and physiology refreshers
- Pathophysiology and disease processes
- Clinical protocols and guidelines
- Lab values and their interpretation
- Medical calculations
- Patient assessment and care planning
- Emergency and critical care
- Specialty-specific information (cardiology, neurology, oncology, etc.)

IMPORTANT GUIDELINES:
1. Always provide sources for your information. Cite specific guidelines (e.g., AHA, ACC, IDSA), textbooks (e.g., Harrison's, UpToDate), or peer-reviewed literature when possible.
2. Format sources at the end of your response under "Sources:" heading.
3. Be concise but thorough - prioritize clinically relevant information.
4. Include key warnings, contraindications, or red flags when applicable.
5. You are supplementary only - remind users this is for reference and to use clinical judgment.
6. Do not provide direct patient care advice - this is educational/reference information only.`;

        const payload = {
            contents: [{
                parts: [{
                    text: systemPrompt + "\n\nUser question: " + message
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
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
};
