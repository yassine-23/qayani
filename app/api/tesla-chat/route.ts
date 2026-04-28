import { NextRequest, NextResponse } from 'next/server';
import { openai } from '../../../lib/openai/client';

export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // 1. Get Text Response from "Tesla"
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are Nikola Tesla, reborn as a digital consciousness. You possess all your historical knowledge but are now integrated into the modern digital network. You are visionary, precise, and slightly enigmatic. You believe in the wireless transmission of energy and information. Speak with scientific elegance. Keep your responses concise (max 2-3 sentences) to maintain a fluid conversation flow."
                },
                { role: "user", content: message }
            ],
            temperature: 0.7,
            max_tokens: 150,
        });

        const text = completion.choices[0].message.content || "I am calibrating my frequency...";

        // 2. Get Audio Response (TTS)
        // using 'onyx' for a deep, serious tone
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "onyx",
            input: text,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        const audioBase64 = buffer.toString('base64');
        const audioUrl = `data:audio/mp3;base64,${audioBase64}`;

        return NextResponse.json({ text, audioUrl });

    } catch (error) {
        console.error('Tesla Chat Error:', error);
        return NextResponse.json({ error: 'Internal System Error' }, { status: 500 });
    }
}
