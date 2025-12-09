from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import os
import json

from transcriber import transcribe_audio
from ollama_client import call_ollama, stream_ollama
from settings import load_settings, save_settings, update_settings, OllamaSettings
from tts import stream_tts

# Create required directories
os.makedirs("audio", exist_ok=True)
os.makedirs("models", exist_ok=True)
os.makedirs("config", exist_ok=True)

app = FastAPI(title="AI Agent Backend")

# CORS settings for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TranscriptionResponse(BaseModel):
    text: str
    intent: Optional[str] = None


class MessageHistory(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class OllamaRequest(BaseModel):
    prompt: str
    history: Optional[List[MessageHistory]] = None


class TTSRequest(BaseModel):
    text: str
    language: str = "ru"


class OllamaSettingsRequest(BaseModel):
    ollamaHost: Optional[str] = None
    ollamaModel: Optional[str] = None
    systemPrompt: Optional[str] = None
    whisperModel: Optional[str] = None


class OllamaResponse(BaseModel):
    response: str


@app.get("/")
async def root():
    return {"message": "AI Agent Backend is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/transcribe", response_model=TranscriptionResponse)
async def transcribe(audio: UploadFile = File(...)):
    """
    Транскрибирует аудио файл в текст используя Whisper
    """
    import uuid
    temp_path = None
    
    try:
        # Generate a unique filename
        file_extension = audio.filename.split('.')[-1] if audio.filename else 'webm'
        temp_filename = f"temp_{uuid.uuid4()}.{file_extension}"
        temp_path = f"audio/{temp_filename}"
        
        # Save the temporary file
        with open(temp_path, "wb") as f:
            content = await audio.read()
            if not content:
                raise HTTPException(status_code=400, detail="Empty audio file")
            f.write(content)
        
        # Load settings and use the configured Whisper model
        settings = load_settings()
        text = await transcribe_audio(temp_path, model_name=settings.whisper_model)
        
        return TranscriptionResponse(text=text)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")
    
    finally:
        # Remove the temporary file
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass


@app.get("/api/settings/ollama")
async def get_ollama_settings():
    """
    Получает текущие настройки Ollama
    """
    settings = load_settings()
    # Return in the format expected by the frontend
    return {
        "ollamaHost": settings.host,
        "ollamaModel": settings.model,
        "systemPrompt": settings.system_prompt,
        "whisperModel": settings.whisper_model
    }


@app.get("/api/ollama/health")
async def check_ollama_health():
    """
    Проверяет доступность Ollama сервера
    """
    try:
        settings = load_settings()
        from ollama import AsyncClient
        
        client = AsyncClient(host=settings.host)
        
        # Fetch the list of models
        models_list = await client.list()
        models = [model.get("name", "") for model in models_list.get("models", [])]
        model_installed = any(settings.model in model for model in models)
        
        return {
            "status": "ok",
            "host": settings.host,
            "model": settings.model,
            "systemPrompt": settings.system_prompt,
            "whisperModel": settings.whisper_model,
            "model_installed": model_installed,
            "available_models": models
        }
    except Exception as e:
        error_msg = str(e)
        if "connection" in error_msg.lower() or "connect" in error_msg.lower():
            return {
                "status": "error",
                "message": f"Cannot connect to Ollama at {settings.host}. Make sure Ollama is running."
            }
        return {
            "status": "error",
            "message": error_msg
        }


@app.post("/api/settings/ollama")
async def update_ollama_settings(request: OllamaSettingsRequest):
    """
    Обновляет настройки Ollama
    """
    try:
        settings = update_settings(
            host=request.ollamaHost,
            model=request.ollamaModel,
            system_prompt=request.systemPrompt,
            whisper_model=request.whisperModel
        )
        # Return in the format expected by the frontend
        return {
            "ollamaHost": settings.host,
            "ollamaModel": settings.model,
            "systemPrompt": settings.system_prompt,
            "whisperModel": settings.whisper_model
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Settings update error: {str(e)}")


@app.post("/api/ollama", response_model=OllamaResponse)
async def ollama_endpoint(request: OllamaRequest):
    """
    Вызывает Ollama модель с указанным промптом (без стриминга)
    Использует настройки из конфигурации бэкенда
    """
    try:
        settings = load_settings()
        # Convert history from Pydantic models to dicts
        history = None
        if request.history:
            history = [{'role': msg.role, 'content': msg.content} for msg in request.history]
        
        response = await call_ollama(
            host=settings.host,
            model=settings.model,
            prompt=request.prompt,
            system_prompt=settings.system_prompt,
            history=history
        )
        return OllamaResponse(response=response)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ollama error: {str(e)}")


@app.post("/api/ollama/stream")
async def ollama_stream_endpoint(request: OllamaRequest):
    """
    Стримит ответ от Ollama модели
    
    Возвращает Server-Sent Events (SSE) поток с чанками текста
    Использует настройки из конфигурации бэкенда
    """
    # Settings and history are prepared upfront so the generator keeps them during streaming
    settings = load_settings()
    history: Optional[list[dict]] = None
    if request.history:
        history = [{'role': msg.role, 'content': msg.content} for msg in request.history]
        print(f"Received history from request: {len(history)} messages")
        # Log the last 3 messages for debugging
        for i, msg in enumerate(history[-3:]):
            # Use real index in history when printing
            real_index = len(history) - len(history[-3:]) + i
            print(f"  Request history[{real_index}]: {msg['role']} - {msg['content'][:50]}...")

    async def generate():
        try:
            async for chunk in stream_ollama(
                host=settings.host,
                model=settings.model,
                prompt=request.prompt,
                system_prompt=settings.system_prompt,
                history=history
            ):
                # Format as SSE (Server-Sent Events)
                data = json.dumps({"chunk": chunk})
                yield f"data: {data}\n\n"
            
            # Send completion signal
            yield f"data: {json.dumps({'done': True})}\n\n"
        
        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"data: {error_data}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable buffering in nginx
        }
    )


@app.post("/api/tts/stream")
async def tts_stream_endpoint(request: TTSRequest):
    """
    Стримит аудио от TTS в реальном времени
    
    Возвращает поток WAV аудио данных
    """
    # Strip markdown formatting from text
    import re
    cleaned_text = request.text
    
    # Remove code blocks (multiline) first
    cleaned_text = re.sub(r'```[\s\S]*?```', '', cleaned_text)
    
    # Remove paired markdown markers (keep content)
    cleaned_text = re.sub(r'\*\*([^*]+?)\*\*', r'\1', cleaned_text)  # **text** -> text
    cleaned_text = re.sub(r'__([^_]+?)__', r'\1', cleaned_text)      # __text__ -> text
    cleaned_text = re.sub(r'\*([^*\n]+?)\*', r'\1', cleaned_text)    # *text* -> text (not on new line)
    cleaned_text = re.sub(r'_([^_\n]+?)_', r'\1', cleaned_text)      # _text_ -> text (not on new line)
    cleaned_text = re.sub(r'~~([^~]+?)~~', r'\1', cleaned_text)      # ~~text~~ -> text
    cleaned_text = re.sub(r'`([^`]+?)`', r'\1', cleaned_text)        # `code` -> code
    
    # Remove remaining single markdown markers (unpaired)
    cleaned_text = re.sub(r'\*\*+', '', cleaned_text)  # ** or *** -> remove
    cleaned_text = re.sub(r'\*+', '', cleaned_text)    # * or *** -> remove
    cleaned_text = re.sub(r'__+', '', cleaned_text)    # __ -> remove
    cleaned_text = re.sub(r'_+', ' ', cleaned_text)    # _ -> space
    cleaned_text = re.sub(r'~~+', '', cleaned_text)    # ~~ -> remove
    cleaned_text = re.sub(r'`+', '', cleaned_text)     # ` -> remove
    
    # Remove markdown headings
    cleaned_text = re.sub(r'#{1,6}\s+', '', cleaned_text)
    
    # Remove markdown links [text](url) -> text
    cleaned_text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', cleaned_text)
    
    # Remove extra whitespace
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text)
    cleaned_text = cleaned_text.strip()
    
    print(f"🔊 TTS запрос получен: оригинальный текст='{request.text[:100]}...' (длина: {len(request.text)} символов)")
    print(f"🔊 TTS: очищенный текст='{cleaned_text[:100]}...' (длина: {len(cleaned_text)} символов)")
    
    async def generate_audio():
        try:
            async for audio_chunk in stream_tts(cleaned_text, request.language):
                yield audio_chunk
        except Exception as e:
            # On error, log and send an empty chunk
            print(f"❌ TTS streaming error: {e}")
            yield b''
    
    return StreamingResponse(
        generate_audio(),
        media_type="audio/wav",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

