
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.sqlite import SqliteSaver
from memory import save_memory, recall_memories, conn
from dotenv import load_dotenv
import os

load_dotenv()

model = ChatOpenAI(
    model="meta/muse-ember",
    base_url="https://api.aicredits.in/v1",
    api_key=os.getenv("OPENAI_API_KEY")
)


checkpointer = SqliteSaver(conn)
checkpointer.setup()

with open("System_prompt.md", "r", encoding="utf-8") as file:
    Sys_prompt = file.read()

from tools import get_hacker_news, get_space_news, get_upcoming_launches

agent = create_agent(
    model=model,
    system_prompt=Sys_prompt,
    tools=[save_memory, recall_memories, get_hacker_news, get_space_news, get_upcoming_launches],
    checkpointer=checkpointer,
)

def chat(message: str):
    result = agent.invoke(
        {"messages": [{"role": "user", "content": message}]},
        config={"configurable": {"thread_id": "main-user"}}
    )
    return result["messages"][-1].content



if __name__ == "__main__":
    while True:
        try:
            msg = input("You: ")
        except KeyboardInterrupt:
            print("Exiting...")
            break
        print("Agent:", chat(msg))
