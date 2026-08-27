import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { query, problemStatement, teamName } = await req.json();

    const apiKey = process.env.LLM_API_KEY;

    if (apiKey) {
      if (apiKey.startsWith('AQ.') || apiKey.startsWith('AIzaSy')) {
        // Dynamic routing to Google Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{
                text: `You are an expert AI Hackathon Assistant for SIH 2026 at RGUKT Nuzvid. Team Name: ${teamName}. Selected Problem Statement: ${problemStatement?.problem_title}. Domain: ${problemStatement?.domain}. Provide practical advice on architecture, pitch structure, technical feasibility, and jury Q&A.`
              }]
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: query }]
              }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return NextResponse.json({ reply });
          }
        } else {
          console.error('Gemini API Error:', await response.text());
        }
      } else {
        // Fallback to OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: `You are an expert AI Hackathon Assistant for SIH 2026 at RGUKT Nuzvid. Team Name: ${teamName}. Selected Problem Statement: ${problemStatement?.problem_title}. Domain: ${problemStatement?.domain}. Provide practical advice on architecture, pitch structure, technical feasibility, and jury Q&A.`
              },
              { role: 'user', content: query }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ reply: data.choices[0].message.content });
        }
      }
    }

    return NextResponse.json({
      reply: `Guidance for ${teamName}: For "${problemStatement?.problem_title || 'your problem statement'}", structure your pitch deck clearly with working prototype metrics, technical architecture, and jury Q&A preparation.`
    });
  } catch (error) {
    return NextResponse.json({ reply: 'AI Assistant processing complete.' });
  }
}
