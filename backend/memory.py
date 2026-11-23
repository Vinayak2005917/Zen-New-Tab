from openai import AsyncOpenAI
from langchain.tools import tool
import os
from dotenv import load_dotenv
load_dotenv()
import pgvector
from pgvector.psycopg import register_vector_async
from utils import debug_print

embedding_client = AsyncOpenAI(
    base_url="https://api.aicredits.in/v1",
    api_key=os.getenv("OPENAI_API_KEY"),
)

async def embed_text(text: str) -> list[float]:
    response = await embedding_client.embeddings.create(
        model="baai/bge-m3",
        input=text,
    )
    return response.data[0].embedding

import psycopg
from pgvector.psycopg import register_vector_async

_connection: psycopg.AsyncConnection | None = None

async def get_connection() -> psycopg.AsyncConnection:
    global _connection

    if _connection is None or _connection.closed:
        _connection = await psycopg.AsyncConnection.connect(
            os.getenv("SUPABASE_URL"),
            autocommit=True,
            prepare_threshold=0,
        )
        await register_vector_async(_connection)

    return _connection


MEMORY_SCOPE = "user_memory"

@tool("add_to_memory", description="Save a fact for later retrieval.")
async def add_to_memory(fact: str) -> str:
    try:
        debug_print(f"Adding to memory: {fact}")
        vector = await embed_text(fact)
        conn = await get_connection()

        await conn.execute(
        """INSERT INTO public.agent_memories (memory_scope, memory_text, embedding) VALUES (%s, %s, %s)""",
        (MEMORY_SCOPE, fact, vector)
        )

        return "Memory saved."
    except Exception as e:
        debug_print(f"Failed to save memory: {str(e)}")
        return f"Failed to save memory: {str(e)}"

@tool("get_memory", description="Get the most relevant memories about the user.")
async def get_memory(query: str, limit: int = 5) -> list:
    try:
        debug_print(f"Retrieving memory for query: '{query}' with limit: {limit}")
        vector = await embed_text(query)
        conn = await get_connection()

        cursor = await conn.execute(
            """
            SELECT id, memory_text, similarity
            FROM public.match_agent_memories(%s::extensions.vector, %s, %s)
            """,
            (vector, MEMORY_SCOPE, limit),
        )

        rows = await cursor.fetchall()
        return [{"id": row[0],"memory_text": row[1],"similarity": float(row[2]),}for row in rows]
    except Exception as e:
        debug_print(f"Failed to retrieve memory: {str(e)}")
        return [{"error": f"Failed to retrieve memory: {str(e)}"}]


async def close_memory_connection() -> None:
    global _connection
    if _connection is not None and not _connection.closed:
        await _connection.close()
    _connection = None
