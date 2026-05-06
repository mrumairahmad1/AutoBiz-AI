import os
from pathlib import Path
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

# Explicitly load the .env from the project root, overriding any cached values
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path, override=True)


def get_llm():
    model = os.getenv("LLM_MODEL", "gpt-4o-mini").strip()

    # Safety guard: reject any non-OpenAI model IDs that may have leaked in
    if "/" in model or ":" in model or not model:
        model = "gpt-4o-mini"

    api_key  = os.getenv("OPENAI_API_KEY", "").strip()
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").strip()

    return ChatOpenAI(
        model=model,
        openai_api_key=api_key,
        openai_api_base=base_url,
        temperature=0.1,
        max_retries=3,
        request_timeout=60,
    )


def invoke_with_fallback(llm, prompt: str) -> str:
    try:
        response = llm.invoke(prompt)
        content = response.content.strip()
        if content:
            return content

        response = llm.invoke(prompt)
        content = response.content.strip()
        if content:
            return content

        return "The AI could not generate a response. Please try rephrasing your question."

    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "rate" in error_msg.lower():
            return "API rate limit reached. Please wait 30 seconds and try again."
        elif "timeout" in error_msg.lower():
            return "Request timed out. Please try again."
        else:
            return f"Error: {error_msg[:100]}. Please try again."


async def astream_with_fallback(llm, prompt: str):
    try:
        full_content = ""
        async for chunk in llm.astream(prompt):
            if chunk.content:
                full_content += chunk.content
                yield chunk.content

        if not full_content.strip():
            response = llm.invoke(prompt)
            content = response.content.strip()
            if content:
                yield content
            else:
                yield "The AI could not generate a response. Please try rephrasing."

    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "rate" in error_msg.lower():
            yield "API rate limit reached. Please wait 30 seconds and try again."
        elif "timeout" in error_msg.lower():
            yield "Request timed out. Please try again."
        else:
            yield "AI service temporarily unavailable. Please try again."