"""
manage application settings
"""
import json
import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, HttpUrl


class OllamaSettings(BaseModel):
    host: str = "http://localhost:11434"
    model: str = "llama2"
    system_prompt: str = "Ты полезный ассистент. Отвечай лаконично, по делу, как собеседник, а не как энциклопедия. Твой ответ должен быть примерно такой же длины или немного длиннее, чем вопрос пользователя. Избегай лишних деталей и воды."
    whisper_model: str = "base"


SETTINGS_FILE = Path("config/settings.json")


def ensure_config_dir():
    """create config directory if it doesn't exist"""
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)


def load_settings() -> OllamaSettings:
    """load settings from file or return default values"""
    ensure_config_dir()
    
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return OllamaSettings(**data)
        except Exception as e:
            print(f"Error loading settings: {e}")
            return OllamaSettings()
    
    # Create a file with default settings
    default_settings = OllamaSettings()
    save_settings(default_settings)
    return default_settings


def save_settings(settings: OllamaSettings) -> OllamaSettings:
    """save settings to file"""
    ensure_config_dir()
    
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings.model_dump(), f, indent=2, ensure_ascii=False)
        return settings
    except Exception as e:
        print(f"Error saving settings: {e}")
        raise


def update_settings(
    host: Optional[str] = None,
    model: Optional[str] = None,
    system_prompt: Optional[str] = None,
    whisper_model: Optional[str] = None
) -> OllamaSettings:
    """update settings"""
    current = load_settings()
    
    if host is not None:
        current.host = host
    if model is not None:
        current.model = model
    if system_prompt is not None:
        current.system_prompt = system_prompt
    if whisper_model is not None:
        current.whisper_model = whisper_model
    
    return save_settings(current)

