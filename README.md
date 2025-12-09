# AI Agent – Voice AI Assistant

[![Python](https://img.shields.io/badge/Python-3.9%2B-blue)](https://www.python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688)](https://fastapi.tiangolo.com)
[![Node](https://img.shields.io/badge/Node-18%2B-339933)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Voice-first assistant with speech-to-text (Whisper), LLM chat via Ollama, and real-time text-to-speech (Piper TTS).

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [Configuration](#configuration)
- [Running](#running)
- [Notes](#notes)
- [License](#license)

## Features
- 🎤 Microphone capture and voice input
- 📝 Whisper transcription (selectable model, default `small`)
- 🤖 Chat with local LLM via Ollama (default `gemma3:latest`)
- 🔊 Streaming TTS with Piper; incremental playback of generated chunks
- 🧠 Dialog history preserved and sent to the model
- ⚙️ Runtime settings UI (Ollama host/model, system prompt, Whisper model)

## Tech Stack
- Backend: FastAPI, Whisper, Ollama client, Piper TTS
- Frontend: React, TypeScript, Vite

## Project Structure
- `backend/` — FastAPI app (`main.py`), Whisper, Ollama client, Piper TTS
- `frontend/` — React + Vite UI, chat, settings, audio recording, TTS client

## Prerequisites
- Python 3.9+
- Node.js 18+
- Ollama running locally with the desired model pulled (e.g., `gemma3:latest`)
- Piper binary installed and the Russian model `models/ru_RU-irina-medium.onnx` present

## Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

## Configuration
- Backend settings: `backend/config/settings.json`
  - `host` — Ollama host (default `http://localhost:11434`)
  - `model` — Ollama model (default `gemma3:latest`)
  - `system_prompt` — system message for the LLM
  - `whisper_model` — Whisper model name (e.g., `small`)
- Piper model path: `backend/models/ru_RU-irina-medium.onnx`

## Running
- Backend:
```bash
cd backend
source venv/bin/activate
python main.py
```
- Frontend (Vite dev server):
```bash
cd frontend
npm run dev
```

## Notes
- Dialog history is sent to Ollama; make sure the model fits in available VRAM/RAM.
- If Piper or the model file is missing, TTS calls will fail—verify the binary and model paths.
- First request to a freshly started Ollama model can be slower; consider a warm-up call.

## License
MIT

