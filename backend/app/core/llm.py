import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()


def get_llm():
    return ChatOpenAI(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
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