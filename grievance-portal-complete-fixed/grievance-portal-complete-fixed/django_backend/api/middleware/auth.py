from functools import wraps
import jwt
from django.http import JsonResponse
from django.conf import settings
from api.models import User

def get_token_from_header(request):
    auth_header = request.headers.get('Authorization', None)
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    return auth_header.split(' ')[1]

def verify_jwt_token(token, is_refresh=False):
    # Retrieve refresh secret if checking a refresh token, otherwise standard secret
    secret = os.getenv('JWT_REFRESH_SECRET', settings.SECRET_KEY) if is_refresh else settings.SECRET_KEY
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return {'error': 'Token expired. Please login again.'}
    except jwt.InvalidTokenError:
        return {'error': 'Invalid token.'}

import os

def jwt_auth_required(view_func):
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        token = get_token_from_header(request)
        if not token:
            return JsonResponse({'success': False, 'message': 'Access denied. No token provided.'}, status=401)
        
        payload = verify_jwt_token(token)
        if 'error' in payload:
            return JsonResponse({'success': False, 'message': payload['error']}, status=401)
        
        user_id = payload.get('userId')
        try:
            user = User.objects.get(id=user_id)
            if not user.is_active:
                return JsonResponse({'success': False, 'message': 'Account is deactivated.'}, status=401)
            request.user = user
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'User not found.'}, status=401)
            
        return view_func(request, *args, **kwargs)
    return wrapped_view

def jwt_optional_auth(view_func):
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        token = get_token_from_header(request)
        request.user = None
        if token:
            payload = verify_jwt_token(token)
            if 'error' not in payload:
                user_id = payload.get('userId')
                try:
                    user = User.objects.get(id=user_id)
                    if user.is_active:
                        request.user = user
                except User.DoesNotExist:
                    pass
        return view_func(request, *args, **kwargs)
    return wrapped_view

def role_required(*roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not getattr(request, 'user', None):
                return JsonResponse({'success': False, 'message': 'Authentication required.'}, status=401)
            if request.user.role not in roles:
                return JsonResponse({
                    'success': False,
                    'message': f"Access forbidden. Required role: {' or '.join(roles)}"
                }, status=403)
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator
