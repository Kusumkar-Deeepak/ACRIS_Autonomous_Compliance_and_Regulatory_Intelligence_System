import os

def get_llm():
    from langchain_community.llms import Ollama
    return Ollama(
        model=os.getenv("OLLAMA_MODEL", "llama3"),
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        temperature=0.1,
    )


def try_generate(prompt: str, fallback: str) -> str:
    try:
        llm = get_llm()
        result = llm.invoke(prompt)
        if isinstance(result, str) and result.strip():
            return result.strip()
    except Exception:
        pass
    return fallback