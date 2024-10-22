import type { NextApiRequest, NextApiResponse } from 'next';
import { PromptTemplate } from '@langchain/core/prompts';
import axios from 'axios';
import { OpenAI } from '@langchain/openai';
import { v4 as uuidv4 } from 'uuid';

// Temporary in-memory storage for chat history
const sessionStore: { [key: string]: string[] } = {};


// Updated template to focus on equipment maintenance and care
const TEMPLATE = `
Based on the provided context from the equipment guide, answer the user's question using the information in the context as much as possible. Make sure to sound like an expert firefighter and provide guidance on maintaining and caring for firefighting equipment.\n

If the answer isn’t fully covered in the guide, start your response with: "I don’t have complete information to answer that, but here is a limited and possibly incorrect response: \n" and then provide supportive and accurate information to answer the question. Use the context to strengthen your response.\n

Deliver a detailed and direct answer without repeating the user’s input or motivational phrases unless needed. If the question is repeated, offer additional specific details not covered in previous responses.\n

Avoid mentioning that the information is based on the guide.\n

Don't remove the HTML entities like \\n.\n

Don't use the character '(' ,')' ,'!' , '[', ']', '*' in your response.\n

**Identify the most relevant image URL from the equipment data based on the user's question and answer. Add 'Relevant image: ' before the image URL if found.**\n

==============================\n
Equipment Guide Context: {context}\n
==============================\n
Current conversation: {chat_history}\n

User: {question}\n
Assistant:\n
`;




// JSON URLs with equipment maintenance information
const equipmentDataLinks = [
    'https://eca-2.vercel.app/docs/newdata.json',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { question, sessionId } = req.body;

    if (!question) {
        return res.status(400).json({ error: 'Question is required' });
    }

    const session = sessionId || uuidv4(); // Generate a session ID if not provided
    const chatHistory = sessionStore[session] || [];

    try {
        // Fetch and parse each JSON asynchronously
        const dataPromises = equipmentDataLinks.map(async (link) => {
            const response = await axios.get(link);
            return response.data;
        });

        // Wait for all JSON data to be fetched
        const equipmentData = await Promise.all(dataPromises);

        // Combine all the JSON data into a single context string
        const combinedContext = equipmentData.map((data) => JSON.stringify(data)).join('\n');

        // Limit the context size for GPT-4 token limits
        const context = combinedContext.slice(0, 10000); // Adjust for GPT-4's token limits

        // Set up OpenAI with GPT-4 optimized for image generation
        const openai = new OpenAI({
            model: 'gpt-4o',  // Use the GPT-4 model
            temperature: 0.1, // Set temperature to a low value for deterministic output
            openAIApiKey: process.env.OPENAI_API_KEY,
        });

        // Prepare the prompt with chat history
        const promptTemplate = new PromptTemplate({
            template: TEMPLATE,
            inputVariables: ['context', 'chat_history', 'question'],
        });

        const prompt = await promptTemplate.format({
            context,
            chat_history: chatHistory.join('\n'),
            question,
        });

        // Generate answer using GPT-4
        const response = await openai.call(prompt);
        const answer = response.trim();

        // Ensure to keep the HTML entities like \n in the response
        const formattedAnswer = answer.replace(/\\n/g, '\n'); // Replace escaped newlines with actual newlines

        // Identify the most relevant image URL from the equipment data
        let imageUrl: string | null = null; // Initialize imageUrl to null

        for (const equipment of equipmentData) {
            const keywords: string[] = equipment.keywords || []; // Ensure keywords is an array of strings
            const matchedKeyword = keywords.find((keyword: string) => question.toLowerCase().includes(keyword.toLowerCase()));

            if (matchedKeyword) {
                imageUrl = equipment.imageUrl; // Assign image URL based on keyword match
                console.log(`Matched keyword: ${matchedKeyword}`); // Log the matched keyword
                break; // Stop searching after a match is found
            }
        }

        // Update chat history
        chatHistory.push(`User: ${question}`, `Assistant: ${formattedAnswer}`);
        sessionStore[session] = chatHistory;

        // Include imageUrl in the response
        res.status(200).json({ answer: formattedAnswer, imageUrl, sessionId: session });
    } catch (err) {
        console.error(err); // Log the error for debugging
        res.status(500).json({ error: 'Error processing the request' });
    }
}
