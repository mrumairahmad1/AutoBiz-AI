import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()


def get_llm():
    return ChatOpenAI(
        model=os.getenv("LLM_MODEL", "openai/gpt-oss-120b:free"),
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        openai_api_base=os.getenv("OPENROUTER_BASE_URL"),
        temperature=0.1,
        max_retries=3,
        request_timeout=60,
    )


def invoke_with_fallback(llm, prompt: str) -> str:
    """Invoke LLM with fallback handling for empty responses."""
    try:
        response = llm.invoke(prompt)
        content = response.content.strip()
        if content:
            return content

        # Retry once if empty
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
    """Async stream with fallback for empty responses."""
    try:
        full_content = ""
        async for chunk in llm.astream(prompt):
            if chunk.content:
                full_content += chunk.content
                yield chunk.content

        if not full_content.strip():
            # Fallback to regular invoke
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