from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from tools import get_hacker_news, get_space_news, get_upcoming_launches
from memory import add_to_memory, get_memory
from dotenv import load_dotenv
import asyncio
import selectors
import os
load_dotenv()
from supabase_conn import connect_checkpointer


with open("System_prompt.md", "r", encoding="utf-8") as file:
    Sys_prompt = file.read()

async def Setup():
    global checkpointer, db_connection
    checkpointer, db_connection = await connect_checkpointer()

    model = ChatOpenAI(
        model="meta/muse-ember",
        base_url="https://api.aicredits.in/v1",
        api_key=os.getenv("OPENAI_API_KEY")
    )

    agent = create_agent(
        model=model,
        system_prompt=Sys_prompt,
        tools=[add_to_memory, get_memory, get_hacker_news, get_space_news, get_upcoming_launches],
        checkpointer=checkpointer,
    )

    return agent

async def chat(message: str):
    agent = await Setup()
    try:
        result = await agent.ainvoke(
            {"messages": [{"role": "user", "content": message}]},
            config={"configurable": {"thread_id": "Testing-1"}})
        return result["messages"][-1].content
    except Exception:
        import traceback
        traceback.print_exc()
        raise


async def shutdown():
    if db_connection is not None:
        await db_connection.close()


if __name__ == "__main__":
    import asyncio

    async def terminal_chat():
        await Setup()
        while True:
            try:
                message = input("You: ")
            except (KeyboardInterrupt, EOFError):
                print("Exiting...")
                break
            print("Agent:", await chat(message))
        await shutdown()

    asyncio.run(
        terminal_chat(),
        loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
    )
