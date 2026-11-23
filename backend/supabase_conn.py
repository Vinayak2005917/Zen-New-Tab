import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

load_dotenv()


async def connect_checkpointer():
    connection = await psycopg.AsyncConnection.connect(
        os.getenv("SUPABASE_URL"),
        autocommit=True,
        prepare_threshold=0,
        row_factory=dict_row,
    )

    checkpointer = AsyncPostgresSaver(connection)
    await checkpointer.setup()

    return checkpointer, connection