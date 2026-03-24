"""
backend/main.py

Main entry point for the BB84 QKD Simulator Backend.
Configures FastAPI, middleware, and includes routers.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routers import simulation

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
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(simulation.router, prefix="/api", tags=["simulation"])

@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "protocol": "BB84",
        "version": "0.3"
    }

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
