import os
import django
from django.core.asgi import get_asgi_application
import socketio
import asyncio

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grievance_portal.settings')
django.setup()

# Create an Async Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
django_asgi_app = get_asgi_application()

@sio.event
async def connect(sid, environ, auth=None):
    print(f"🟢 WebSocket client connected: {sid}")

@sio.event
async def join_complaint(sid, complaintId):
    await sio.enter_room(sid, f"complaint_{complaintId}")
    print(f"📡 Client {sid} joined complaint room: {complaintId}")

@sio.event
async def join_user(sid, userId):
    await sio.enter_room(sid, f"user_{userId}")
    print(f"📡 Client {sid} joined user room: {userId}")

@sio.event
async def join_authority(sid, authorityId):
    await sio.enter_room(sid, f"authority_{authorityId}")
    print(f"📡 Authority {authorityId} joined dashboard room")

@sio.event
async def disconnect(sid):
    print(f"🔴 WebSocket client disconnected: {sid}")

# Wrap Django ASGI application with socketio ASGI application
application = socketio.ASGIApp(sio, django_asgi_app)
