from ollama import AsyncClient
from typing import AsyncGenerator, Optional, List

async def call_ollama(
    host: str = "http://localhost:11434",
    model: str = "llama2",
    prompt: str = "",
    system_prompt: str = "",
    history: Optional[List[dict]] = None
) -> str:
    """
    Вызывает Ollama модель с указанным промптом
    
    Args:
        host: URL Ollama сервера (по умолчанию http://localhost:11434)
        model: Название модели Ollama
        prompt: Промпт для модели
        system_prompt: Системный промпт для настройки поведения модели
    
    Returns:
        Ответ от модели
    """
    if not prompt:
        raise ValueError("Prompt cannot be empty")
    
    try:
        client = AsyncClient(host=host)
        print(f"Calling Ollama: {host} with model: {model}")
        print(f"Prompt: {prompt[:100]}...")
        if system_prompt:
            print(f"System prompt: {system_prompt[:100]}...")
        if history:
            print(f"History: {len(history)} messages")
        
        # Build messages with system prompt if provided
        messages = []
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})
        
        # Append chat history
        if history:
            messages.extend(history)
        
        # Append current prompt
        messages.append({'role': 'user', 'content': prompt})
        
        print(f"Total messages: {len(messages)} (system: {1 if system_prompt else 0}, history: {len(history) if history else 0}, user: 1)")
        
        # Use chat API for dialogues (preferred way)
        response = await client.chat(
            model=model,
            messages=messages,
            stream=False
        )
        
        result_text = response.get('message', {}).get('content', '')
        print(f"Ollama response received: {len(result_text)} characters")
        return result_text
    
    except Exception as e:
        error_msg = str(e)
        if "404" in error_msg or "not found" in error_msg.lower():
            raise Exception(
                f"Ollama endpoint not found (404). "
                f"Make sure Ollama is running at {host} and the model '{model}' is installed. "
                f"Try: ollama pull {model}"
            )
        elif "connection" in error_msg.lower() or "connect" in error_msg.lower():
            raise Exception(
                f"Cannot connect to Ollama at {host}. "
                f"Make sure Ollama is running. Try: ollama serve"
            )
        else:
            raise Exception(f"Ollama API error: {error_msg}")


async def stream_ollama(
    host: str = "http://localhost:11434",
    model: str = "llama2",
    prompt: str = "",
    system_prompt: str = "",
    history: Optional[List[dict]] = None
) -> AsyncGenerator[str, None]:
    """
    Стримит ответ от Ollama модели
    
    Args:
        host: URL Ollama сервера
        model: Название модели Ollama
        prompt: Промпт для модели
        system_prompt: Системный промпт для настройки поведения модели
        history: История предыдущих сообщений [{'role': 'user'|'assistant', 'content': '...'}]
    
    Yields:
        Чанки текста от модели
    """
    if not prompt:
        raise ValueError("Prompt cannot be empty")
    
    try:
        client = AsyncClient(host=host)
        print(f"Streaming from Ollama: {host} with model: {model}")
        print(f"Prompt: {prompt[:100]}...")
        if system_prompt:
            print(f"System prompt: {system_prompt[:100]}...")
        if history:
            print(f"History: {len(history)} messages")
            # Log the last 3 history messages for debugging
            for i, msg in enumerate(history[-3:]):
                print(f"  History[{len(history)-3+i}]: {msg.get('role', 'unknown')} - {msg.get('content', '')[:50]}...")
        
        # Build messages with system prompt if provided
        messages = []
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})
        
        # Append chat history
        if history:
            messages.extend(history)
        
        # Append current prompt
        messages.append({'role': 'user', 'content': prompt})
        
        print(f"Total messages: {len(messages)} (system: {1 if system_prompt else 0}, history: {len(history) if history else 0}, user: 1)")
        # Log structure for debugging
        print(f"Messages structure: {[{'role': m.get('role'), 'len': len(m.get('content', ''))} for m in messages[:5]]}...")
        # Log full contents of all messages for debugging
        print("Full messages content:")
        for i, msg in enumerate(messages):
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')
            print(f"  [{i}] {role}: {content[:100]}{'...' if len(content) > 100 else ''}")
        
        # Use chat with stream=True for streaming responses
        # Important: pass full messages array (system + history + current user)
        # Double-check format before sending
        print(f"Sending to Ollama: {len(messages)} messages")
        for i, msg in enumerate(messages):
            print(f"  Message {i}: role={msg.get('role')}, content_length={len(msg.get('content', ''))}")
        
        stream = await client.chat(
            model=model,
            messages=messages,  # Full array: system + history + current user
            stream=True
        )
        
        async for chunk in stream:
            # In chat API the content is in chunk['message']['content']
            if 'message' in chunk and 'content' in chunk['message']:
                content = chunk['message']['content']
                if content:
                    yield content
            # Check if response is finished
            if chunk.get('done', False):
                break
    
    except Exception as e:
        error_msg = str(e)
        if "404" in error_msg or "not found" in error_msg.lower():
            raise Exception(
                f"Ollama endpoint not found (404). "
                f"Make sure Ollama is running at {host} and the model '{model}' is installed. "
                f"Try: ollama pull {model}"
            )
        elif "connection" in error_msg.lower() or "connect" in error_msg.lower():
            raise Exception(
                f"Cannot connect to Ollama at {host}. "
                f"Make sure Ollama is running. Try: ollama serve"
            )
        else:
            raise Exception(f"Ollama streaming error: {error_msg}")
