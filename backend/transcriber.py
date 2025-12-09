"""
module for audio transcription using Whisper
"""
import whisper
import os
from pathlib import Path

# Global variable to store the model and its name
_whisper_model = None
_current_model_name = None


def load_whisper_model(model_name: str = "base"):
    """
    load Whisper model (reload if the model changed)
    """
    global _whisper_model, _current_model_name
    
    # If the model is already loaded and unchanged, reuse it
    if _whisper_model is not None and _current_model_name == model_name:
        return _whisper_model
    
    # If the model changed, load a new one
    if _whisper_model is not None:
        print(f"Switching Whisper model from {_current_model_name} to {model_name}...")
        # Free memory from the old model
        del _whisper_model
        _whisper_model = None
    
    print(f"Loading Whisper model: {model_name}...")
    _whisper_model = whisper.load_model(model_name)
    _current_model_name = model_name
    print("Whisper model loaded successfully")
    return _whisper_model


async def transcribe_audio(audio_path: str, model_name: str = "base") -> str:
    """
    transcribe audio file to text
    
    Args:
        audio_path: path to audio file
        model_name: Whisper model name (tiny, base, small, medium, large)
    
    Returns:
        transcribed text
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")
    
    # Load model
    model = load_whisper_model(model_name)
    
    # Run transcription
    print(f"Transcribing audio: {audio_path}")
    result = model.transcribe(audio_path, language="ru")
    
    text = result["text"].strip()
    print(f"Transcription result: {text}")
    
    return text

