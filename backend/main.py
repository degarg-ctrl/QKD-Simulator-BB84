<<<<<<< Updated upstream
=======
"""
backend/main.py

Main entry point for the BB84 QKD Simulator Backend.
Configures FastAPI, middleware, and includes routers.
"""

>>>>>>> Stashed changes
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import simulation

<<<<<<< Updated upstream
app = FastAPI(title="QKD BB84 Simulator", version="0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
=======
app = FastAPI(
    title="BB84 QKD Simulator API",
    description="Backend API for simulating Quantum Key Distribution protocol",
    version="0.1.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
>>>>>>> Stashed changes
    allow_methods=["*"],
    allow_headers=["*"],
)

<<<<<<< Updated upstream
app.include_router(simulation.router, prefix="/api")

@app.get("/")
def health():
    return {"status": "ok", "protocol": "BB84", "version": "0.1"}
=======
# Include routers
app.include_router(simulation.router, prefix="/api", tags=["simulation"])

@app.get("/")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "protocol": "BB84",
        "version": "0.1"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
>>>>>>> Stashed changes
