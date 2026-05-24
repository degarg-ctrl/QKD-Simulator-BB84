import os
import subprocess
import sys
import time
import webbrowser
import atexit

processes = []

def cleanup():
    print("\nShutting down servers...")
    for p in processes:
        if p.poll() is None:
            # For Windows, sending terminate to a shell=True process might not kill children.
            # Using taskkill is more reliable on Windows.
            if os.name == 'nt':
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(p.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                p.terminate()

def main():
    print("=== QKD Simulator v0.3 Launcher ===\n")
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")
    backend_dir = os.path.join(root_dir, "backend")

    atexit.register(cleanup)

    # 1. Start FastAPI Backend
    print("[1/2] Starting FastAPI Backend on port 8000...")
    os.environ["PYTHONPATH"] = backend_dir
    backend_p = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=backend_dir
    )
    processes.append(backend_p)

    # 2. Start Frontend Dev Server
    print("[2/2] Starting React Dev Server on port 5173...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_p = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir
    )
    processes.append(frontend_p)

    # Give servers a moment to start
    time.sleep(3)

    # Open Browser
    print("\nOpening browser at http://localhost:5173 ...")
    webbrowser.open("http://localhost:5173")

    print("\nPress CTRL+C anytime to stop both servers gracefully.\n")
    try:
        # Keep main thread alive waiting for processes 
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        sys.exit(0)

if __name__ == "__main__":
    main()
