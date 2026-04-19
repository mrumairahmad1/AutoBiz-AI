from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
from pathlib import Path

# Explicitly load .env from backend folder
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("OPENAI_API_KEY")
base_url = os.getenv("OPENAI_BASE_URL")

print("API KEY:", api_key)

llm = ChatOpenAI(
    model="openai/gpt-oss-120b:free",
    temperature=0,
    api_key=api_key,
    base_url=base_url
)