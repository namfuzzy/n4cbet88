import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'AIzaSyAtsWt9KCcC03xjKwhdH06tY1mkdt9xFn0' });

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemma-3-27b-it',
      contents: 'Hello',
    });
    console.log(response.text);
  } catch (e) {
    console.error(e);
  }
}

run();
