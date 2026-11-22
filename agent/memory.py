from langchain.tools import tool
from utils import debug_print
import sqlite3

conn = sqlite3.connect("agent.db", check_same_thread=False)

@tool("save_memory", description="Save something important about the user for future conversations.")
def save_memory(content: str) -> str:
    debug_print(f"Saving memory: {content}")
    with sqlite3.connect("memories.db") as db:
        db.execute("CREATE TABLE IF NOT EXISTS memories (content TEXT)")
        db.execute("INSERT INTO memories VALUES (?)", (content,))
    return "Memory saved."

@tool("recall_memories", description="Recall previously saved information about the user.")
def recall_memories() -> str:
    debug_print("Recalling memories")
    with sqlite3.connect("memories.db") as db:
        db.execute("CREATE TABLE IF NOT EXISTS memories (content TEXT)")
        rows = db.execute("SELECT content FROM memories").fetchall()
    return "\n".join(row[0] for row in rows) or "No memories yet."