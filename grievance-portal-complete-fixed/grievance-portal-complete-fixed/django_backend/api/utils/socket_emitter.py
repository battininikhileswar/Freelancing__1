import asyncio
import threading

# Helper to run async coroutines from synchronous threads
def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    if loop.is_running():
        # If the loop is already running, run it using run_coroutine_threadsafe
        # or execute it in a separate thread
        t = threading.Thread(target=lambda: asyncio.run(coro))
        t.start()
        t.join()
    else:
        loop.run_until_complete(coro)

def emit_socket_event(event, data, room=None):
    try:
        from grievance_portal.asgi import sio
        coro = sio.emit(event, data, room=room)
        run_async(coro)
        print(f"📡 Emitted socket event '{event}' to room '{room}' successfully.")
    except Exception as e:
        print(f"⚠️ Failed to emit socket event '{event}': {str(e)}")
