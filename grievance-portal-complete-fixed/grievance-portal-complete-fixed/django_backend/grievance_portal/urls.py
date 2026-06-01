from django.contrib import admin
from django.urls import path, include, re_path
from django.shortcuts import render
from django.views.static import serve
from django.conf import settings
from django.http import HttpResponse
import os

def index_view(request, *args, **kwargs):
    # Serve Vite index.html from dist
    dist_dir = os.path.join(settings.BASE_DIR.parent, 'frontend', 'dist')
    index_path = os.path.join(dist_dir, 'index.html')
    if os.path.exists(index_path):
        with open(index_path, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read())
    else:
        return HttpResponse("Frontend build not found. Please run 'npm run build' in the frontend directory.", status=404)

urlpatterns = [
    path('django_admin/', admin.site.urls), # Renamed to not clash with React admin
    path('api/', include('api.urls')),
    path('accounts/', include('allauth.urls')),
    # Serve static assets directly if frontend has been compiled
    re_path(r'^assets/(?P<path>.*)$', serve, {
        'document_root': os.path.join(settings.BASE_DIR.parent, 'frontend', 'dist', 'assets') if os.path.exists(os.path.join(settings.BASE_DIR.parent, 'frontend', 'dist', 'assets')) else os.path.join(settings.BASE_DIR, 'static_fallback')
    }),
    # Serve root-level files (login-bg.png, sw.js, favicon.svg, etc.) from dist root
    re_path(r'^(?P<path>[^/]+\.[^/]+)$', serve, {
        'document_root': os.path.join(settings.BASE_DIR.parent, 'frontend', 'dist') if os.path.exists(os.path.join(settings.BASE_DIR.parent, 'frontend', 'dist')) else os.path.join(settings.BASE_DIR, 'static_fallback')
    }),
    # Catch-all route to serve the React SPA for routing compatibility
    re_path(r'^.*$', index_view),
]
