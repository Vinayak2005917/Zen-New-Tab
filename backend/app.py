from fastapi import FastAPI
from agent import chat
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

@app.api_route("/", methods=["GET", "HEAD"])
async def head():
    return {"status": "ok"}

@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok"}

@app.get("/chat")
async def chat_endpoint(message: str, thread_id: str):
    response = await chat(message, thread_id=thread_id)
    return {"response": response}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
