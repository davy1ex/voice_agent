"""
Text-to-Speech module using Piper TTS
"""
import os
import subprocess
import asyncio
import uuid
from pathlib import Path
from typing import AsyncGenerator

# Path to the Piper model
PIPER_MODEL_PATH = "models/ru_RU-irina-medium.onnx"
PIPER_BINARY = "piper"  # Must be installed in the system


async def text_to_speech(text: str, output_path: str = "audio/output.wav", language: str = "ru") -> str:
    """
    Convert text to speech using Piper TTS
    
    Args:
        text: Text to voice
        output_path: Path to save the audio file
        language: Language (ru, en, etc.)
    
    Returns:
        Path to the generated audio file
    """
    # Check Piper availability
    try:
        result = subprocess.run(
            ["which", "piper"],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            raise FileNotFoundError("Piper TTS not found. Please install it first.")
    except Exception as e:
        raise Exception(f"Piper TTS error: {str(e)}")
    
    # Create directory if it does not exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Model for Russian language
    model_path = PIPER_MODEL_PATH
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Piper model not found at {model_path}. "
            "Please make sure the model file exists in the models directory."
        )
    
    try:
        # Run Piper
        # --length_scale 0.5 speeds speech 2x (smaller value = faster)
        cmd = [
            "piper",
            "--model", model_path,
            "--output_file", output_path,
            "--length_scale", "0.5"  # Speed up 2x
        ]
        
        process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(input=text)
        
        if process.returncode != 0:
            raise Exception(f"Piper TTS failed: {stderr}")
        
        return output_path
    
    except Exception as e:
        raise Exception(f"TTS error: {str(e)}")


async def stream_tts(text: str, language: str = "ru") -> AsyncGenerator[bytes, None]:
    """
    Stream TTS audio in real time
    
    Args:
        text: Text to voice
        language: Language (ru, en, etc.)
    
    Yields:
        Audio data chunks (WAV)
    """
    # Check Piper availability
    try:
        result = subprocess.run(
            ["which", "piper"],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            raise FileNotFoundError("Piper TTS not found. Please install it first.")
    except Exception as e:
        raise Exception(f"Piper TTS error: {str(e)}")
    
    # Model for Russian language
    model_path = PIPER_MODEL_PATH
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Piper model not found at {model_path}. "
            "Please make sure the model file exists in the models directory."
        )
    
    try:
        # Run Piper with stdout output (WAV format)
        # --length_scale 0.5 speeds speech 2x (smaller value = faster)
        cmd = [
            "piper",
            "--model", model_path,
            "--output_file", "-",  # Output to stdout
            "--length_scale", "0.5"  # Speed up 2x
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        # Send text to the process
        process.stdin.write(text.encode('utf-8'))
        await process.stdin.drain()
        process.stdin.close()
        
        # Read audio data in chunks
        while True:
            chunk = await process.stdout.read(4096)  # Read 4KB per chunk
            if not chunk:
                break
            yield chunk
        
        # Wait for the process to finish
        await process.wait()
        
        if process.returncode != 0:
            stderr = await process.stderr.read()
            raise Exception(f"Piper TTS failed: {stderr.decode()}")
    
    except Exception as e:
        raise Exception(f"TTS streaming error: {str(e)}")


