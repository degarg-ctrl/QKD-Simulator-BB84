from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import simulation

app = FastAPI(title="QKD BB84 Simulator", version="0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(simulation.router, prefix="/api")

@app.get("/")
def health():
    return {"status": "ok", "protocol": "BB84", "version": "0.1"}
