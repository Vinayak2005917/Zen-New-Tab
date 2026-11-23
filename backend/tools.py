
import httpx
from langchain.tools import tool

HN = "https://hacker-news.firebaseio.com/v0"
SN = "https://api.spaceflightnewsapi.net/v4"
LL2 = "https://ll.thespacedevs.com/2.2.0"

@tool("get_hacker_news", description="Get the latest top Hacker News stories.")
async def get_hacker_news(limit: int = 10) -> list:
    async with httpx.AsyncClient(timeout=10) as client:
        ids = (await client.get(f"{HN}/topstories.json")).json()[:limit]
        responses = await __import__("asyncio").gather(*[
            client.get(f"{HN}/item/{id}.json") for id in ids
        ])
        return [
            {
                "title": r.json().get("title"),
                "url": r.json().get("url"),
                "score": r.json().get("score"),
                "comments": r.json().get("descendants"),
                "time": r.json().get("time"),
            }
            for r in responses if r.status_code == 200 and r.json()
        ]

@tool("get_space_news", description="Get the latest spaceflight news articles.")
async def get_space_news(limit: int = 10) -> list:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{SN}/articles/", params={"limit": limit})
        r.raise_for_status()
        return [
            {
                "title": a["title"],
                "summary": a.get("summary"),
                "url": a["url"],
                "published": a.get("published_at"),
                "source": a.get("news_site"),
            }
            for a in r.json().get("results", [])
        ]

@tool("get_upcoming_launches", description="Get upcoming rocket launches and their schedules.")
async def get_upcoming_launches(limit: int = 10) -> list:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"{LL2}/launch/upcoming/",
            params={"limit": limit, "mode": "list"}
        )
        r.raise_for_status()
        return [
            {
                "name": launch.get("name"),
                "provider": (launch.get("launch_service_provider") or {}).get("name"),
                "rocket": (launch.get("rocket") or {}).get("configuration", {}).get("name"),
                "launch_time": launch.get("net"),
                "status": (launch.get("status") or {}).get("name"),
                "location": (launch.get("pad") or {}).get("location", {}).get("name"),
                "url": launch.get("url"),
            }
            for launch in r.json().get("results", [])
        ]
