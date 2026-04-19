from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
from pathlib import Path

env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("OPENAI_API_KEY")

llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,
    api_key=api_key,
)