# ChanduLabs – Live Talking AI with Voice Cloning

ChanduLabs is a lightweight ElevenLabs-style voice system that uses:
- A custom Colab server for voice synthesis (Gemini TTS + optional RVC)
- A simple Vercel frontend for live chat
- Unlimited language support (EN, HI, TE, TA, KN, ML, BN)
- Your own cloned voice for responses

## 📌 Features
- Text-to-speech using your cloned voice
- Multi-language input and output
- Works with microphone or typed text
- Frontend built with HTML + JS
- Backend API deployed on Vercel
- Voice processing done through a Colab server tunnel (loca.lt)

## 📁 Project Structure
```
index.html          → main UI
public/app.js       → frontend logic
api/voice.js        → backend API on Vercel
package.json        → project config for Vercel
vercel.json         → routing + build settings
README.md           → project description
```

## 🔗 Required Environment Variables (Vercel)
- `RVC_SERVER_URL` = Your public Colab URL (loca.lt)
- `GEMINI_API_KEY` = Your Gemini API key

## 🚀 How It Works
1. Colab hosts the voice synthesis server (FastAPI)
2. loca.lt exposes a public URL
3. Vercel frontend sends requests to your Colab server
4. Your cloned voice is generated and returned as audio
5. Browser plays the audio instantly

## 🖥️ Deployment
- Connect this repo to Vercel
- Add environment variables
- Redeploy
- Open the app and test your live talking AI

## 🎤 Voice Cloning (Optional)
You can attach an RVC model later for true voice cloning.
(Current version uses Gemini TTS as fallback.)
