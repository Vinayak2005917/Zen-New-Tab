from langchain_openai import OpenAIEmbeddings
from langchain.tools import tool
from supabase_conn import connect_checkpointer
import asyncio
import os
from pgvector.psycopg import register_vector_async

embeddings = OpenAIEmbeddings(
    model="baai/bge-m3baai/bge-m3",
    base_url="https://api.aicredits.in/v1",
    api_key=os.getenv("OPENAI_API_KEY"),
)

async def get_connection() -> psycopg.AsyncConnection:
    global _connection

    if _connection is None or _connection.closed:
        _connection = await psycopg.AsyncConnection.connect(
            os.getenv("SUPABASE_URL"),
            autocommit=True,
            prepare_threshold=0,
        )
        await register_vector_async(_connection, schema="extensions")

    return _connection