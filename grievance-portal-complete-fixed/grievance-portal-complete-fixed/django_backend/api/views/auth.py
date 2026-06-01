import json
import os
import jwt
import re
import requests
from datetime import datetime, timedelta
from django.http import JsonResponse, HttpResponse
from django.shortcuts import redirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.utils import timezone
from api.models import User, Notification
from api.middleware.auth import jwt_auth_required, jwt_optional_auth, verify_jwt_token

def generate_token(user_id, role):
    exp = datetime.utcnow() + timedelta(days=7)
    payload = {
        'userId': str(user_id),
        'role': role,
        'exp': exp
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

def generate_refresh_token(user_id):
    exp = datetime.utcnow() + timedelta(days=30)
    payload = {
        'userId': str(user_id),
        'exp': exp
    }
    secret = os.getenv('JWT_REFRESH_SECRET', settings.SECRET_KEY)
    return jwt.encode(payload, secret, algorithm='HS256')

@csrf_exempt
@require_http_methods(["POST"])
def register_view(request):
    try:
        body = json.loads(request.body)
    except ValueError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

    name = body.get('name', '').strip()
    email = body.get('email', '').strip().lower()
    password = body.get('password', '')
    phone = body.get('phone', '').strip() if body.get('phone') else None
    state = body.get('state', '').strip().lower()
    district = body.get('district', '').strip().lower()

    if not name or not email or not password or not state or not district:
        return JsonResponse({'success': False, 'message': 'All fields are required'}, status=400)

    # Check existing user
    if User.objects.filter(email=email).exists():
        return JsonResponse({
            'success': False,
            'message': 'Email already registered. Please login.',
            'errors': [{'field': 'email', 'message': 'This email is already in use'}]
        }, status=400)

    # Validate password complexity
    if not re.match(r'^(?=.*[a-z])^(?=.*[A-Z])^(?=.*\d).+$', password):
        return JsonResponse({
            'success': False,
            'message': 'Password must contain uppercase, lowercase, and number',
            'errors': [{'field': 'password', 'message': 'Password does not meet complexity requirements'}]
        }, status=400)

    try:
        user = User(
            name=name,
            email=email,
            phone=phone,
            state=state,
            district=district,
            role='citizen',
            is_active=True,
            is_verified=False
        )
        user.set_password(password)
        user.save()

        token = generate_token(user.id, user.role)
        refresh_token = generate_refresh_token(user.id)

        return JsonResponse({
            'success': True,
            'message': 'Registration successful',
            'data': {
                'token': token,
                'refreshToken': refresh_token,
                'user': {
                    'id': user.id,
                    'name': user.name if hasattr(user, 'name') else user.first_name, # handles name field fallback
                    'email': user.email,
                    'role': user.role,
                    'state': user.state,
                    'district': user.district,
                    'phone': user.phone,
                }
            }
        }, status=201)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': 'Registration failed. Please try again.',
            'errors': [{'field': 'general', 'message': str(e)}]
        }, status=500)

# Add name property fallback dynamically to User model for compatibility
if not hasattr(User, 'name'):
    @property
    def user_name_prop(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email.split('@')[0]
    @user_name_prop.setter
    def user_name_prop(self, value):
        parts = value.split(' ', 1)
        self.first_name = parts[0]
        self.last_name = parts[1] if len(parts) > 1 else ''
    User.name = user_name_prop

@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    try:
        body = json.loads(request.body)
    except ValueError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

    email = body.get('email', '').strip().lower()
    password = body.get('password', '')

    if not email or not password:
        return JsonResponse({'success': False, 'message': 'Email and password required'}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Invalid email or password.'}, status=401)

    if not user.is_active:
        return JsonResponse({'success': False, 'message': 'Account is deactivated. Contact support.'}, status=401)

    if not user.check_password(password):
        return JsonResponse({'success': False, 'message': 'Invalid email or password.'}, status=401)

    # Update last login
    user.last_login_at = timezone.now()
    user.save(update_fields=['last_login_at'])

    token = generate_token(user.id, user.role)
    refresh_token = generate_refresh_token(user.id)

    return JsonResponse({
        'success': True,
        'message': 'Login successful',
        'data': {
            'token': token,
            'refreshToken': refresh_token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'state': user.state,
                'district': user.district,
                'phone': user.phone,
                'authorityType': user.authority_type,
                'jurisdiction': user.jurisdiction,
            }
        }
    })

@csrf_exempt
@require_http_methods(["POST"])
def refresh_token_view(request):
    try:
        body = json.loads(request.body)
    except ValueError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

    token = body.get('refreshToken', '')
    if not token:
        return JsonResponse({'success': False, 'message': 'Refresh token required.'}, status=400)

    payload = verify_jwt_token(token, is_refresh=True)
    if 'error' in payload:
        return JsonResponse({'success': False, 'message': payload['error']}, status=401)

    user_id = payload.get('userId')
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'User not found.'}, status=404)

    new_token = generate_token(user.id, user.role)
    return JsonResponse({
        'success': True,
        'data': {'token': new_token}
    })

@csrf_exempt
@jwt_auth_required
@require_http_methods(["GET", "PUT"])
def profile_view(request):
    user = request.user
    if request.method == "GET":
        return JsonResponse({
            'success': True,
            'data': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'phone': user.phone,
                'state': user.state,
                'district': user.district,
                'complaintsCount': user.complaints_count,
                'authorityType': user.authority_type,
                'authorityId': user.authority_id,
                'jurisdiction': user.jurisdiction,
                'isActive': user.is_active,
                'isVerified': user.is_verified,
            }
        })
    elif request.method == "PUT":
        try:
            body = json.loads(request.body)
        except ValueError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

        name = body.get('name')
        phone = body.get('phone')
        state = body.get('state')
        district = body.get('district')

        if name:
            user.name = name.strip()
        if phone:
            user.phone = phone.strip()
        if state:
            user.state = state.strip().lower()
        if district:
            user.district = district.strip().lower()
            
        user.save()
        return JsonResponse({'success': True, 'message': 'Profile updated successfully.'})

@csrf_exempt
@jwt_auth_required
@require_http_methods(["PUT"])
def change_password_view(request):
    try:
        body = json.loads(request.body)
    except ValueError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

    current_password = body.get('currentPassword', '')
    new_password = body.get('newPassword', '')

    user = request.user
    if not user.check_password(current_password):
        return JsonResponse({'success': False, 'message': 'Current password is incorrect.'}, status=400)

    user.set_password(new_password)
    user.save()
    return JsonResponse({'success': True, 'message': 'Password changed successfully.'})

@csrf_exempt
@jwt_auth_required
@require_http_methods(["GET"])
def notifications_view(request):
    user = request.user
    notifications = Notification.objects.filter(user_id=user.id).order_by('-created_at')[:20]
    
    data = []
    for n in notifications:
        data.append({
            'id': n.id,
            'userId': n.user_id,
            'type': n.type,
            'title': n.title,
            'message': n.message,
            'metadata': n.metadata,
            'isRead': n.is_read,
            'createdAt': n.created_at.isoformat()
        })
    return JsonResponse({'success': True, 'data': data})

@csrf_exempt
@jwt_auth_required
@require_http_methods(["PUT"])
def mark_all_notifications_read_view(request):
    user = request.user
    unread = Notification.objects.filter(user_id=user.id, is_read=False)
    count = unread.count()
    unread.update(is_read=True)
    return JsonResponse({
        'success': True,
        'message': f"{count} notifications marked as read."
    })

@csrf_exempt
@jwt_auth_required
@require_http_methods(["PUT"])
def mark_notification_read_view(request, id):
    try:
        notification = Notification.objects.get(id=id, user_id=request.user.id)
        notification.is_read = True
        notification.save()
        return JsonResponse({'success': True, 'message': 'Notification marked as read.'})
    except Notification.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Notification not found.'}, status=404)


@csrf_exempt
@require_http_methods(["POST"])
def google_login_view(request):
    try:
        body = json.loads(request.body)
    except ValueError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

    id_token = body.get('idToken', '')
    if not id_token:
        return JsonResponse({'success': False, 'message': 'Google credentials ID Token is required.'}, status=400)

    # 1. Verify Google token against Google's API
    try:
        google_res = requests.get(f'https://oauth2.googleapis.com/tokeninfo?id_token={id_token}', timeout=10)
        if google_res.status_code != 200:
            print('❌ Google Tokeninfo API failed:', google_res.text)
            return JsonResponse({'success': False, 'message': 'Google token validation failed.'}, status=401)
        payload = google_res.json()
    except Exception as e:
        print('❌ Google token verification error:', str(e))
        return JsonResponse({'success': False, 'message': 'Invalid Google authentication token.'}, status=401)

    email = payload.get('email', '')
    name = payload.get('name', '')
    picture = payload.get('picture', '')
    google_id = payload.get('sub', '')

    if not email:
        return JsonResponse({'success': False, 'message': 'Google account does not expose email address.'}, status=400)

    normalized_email = email.strip().lower()

    # 2. Query User model by email
    try:
        user = User.objects.get(email=normalized_email)
        
        # User exists, check if active
        if not user.is_active:
            return JsonResponse({'success': False, 'message': 'Account is deactivated. Contact support.'}, status=401)
            
        # Update last login
        user.last_login_at = timezone.now()
        user.save(update_fields=['last_login_at'])
        
    except User.DoesNotExist:
        # 3. User does not exist, create automatically
        print(f"👤 Creating new Google user: {normalized_email}")
        try:
            parts = name.strip().split(' ', 1)
            first_name = parts[0] if len(parts) > 0 else 'Google'
            last_name = parts[1] if len(parts) > 1 else 'User'
            
            user = User(
                email=normalized_email,
                first_name=first_name,
                last_name=last_name,
                role='citizen',
                phone=None,
                state='andhra pradesh',   # Default required fields
                district='guntur',
                is_active=True,
                is_verified=True,
                complaints_count=0,
                last_login_at=timezone.now()
            )
            user.set_unusable_password()
            user.save()
        except Exception as create_err:
            print("❌ Failed to create Google User:", str(create_err))
            return JsonResponse({
                'success': False, 
                'message': 'Failed to create Google user profile.', 
                'errors': [{'field': 'general', 'message': str(create_err)}]
            }, status=500)

    # 4. Generate Auth Tokens
    token = generate_token(user.id, user.role)
    refresh_token = generate_refresh_token(user.id)

    print(f"✅ Google Sign-In successful for: {normalized_email}")

    return JsonResponse({
        'success': True,
        'message': 'Google login successful',
        'data': {
            'token': token,
            'refreshToken': refresh_token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'state': user.state,
                'district': user.district,
                'phone': user.phone,
                'profilePicture': picture or None,
                'authProvider': 'google',
                'authorityType': user.authority_type,
                'jurisdiction': user.jurisdiction,
            }
        }
    })


@csrf_exempt
def google_oauth_success_view(request):
    if not request.user.is_authenticated:
        return redirect('/login')

    user = request.user
    if not user.is_active:
        return HttpResponse("Your account is deactivated. Please contact support.", status=401)

    # 1. Update last login
    user.last_login_at = timezone.now()
    user.save(update_fields=['last_login_at'])

    # 2. Retrieve profile picture from SocialAccount
    picture = None
    try:
        from allauth.socialaccount.models import SocialAccount
        social_acc = SocialAccount.objects.get(user=user, provider='google')
        extra_data = social_acc.extra_data
        picture = extra_data.get('picture') or extra_data.get('avatar_url')
    except Exception:
        pass

    # 3. Generate tokens
    token = generate_token(user.id, user.role)
    refresh_token = generate_refresh_token(user.id)

    # 4. Escape inputs for safe Javascript rendering
    import json
    user_data = {
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'state': user.state,
        'district': user.district,
        'phone': user.phone,
        'profilePicture': picture,
        'authProvider': 'google',
        'authorityType': user.authority_type,
        'jurisdiction': user.jurisdiction,
    }
    user_json = json.dumps(user_data)

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Smart City Issue Tracker - Syncing Account</title>
        <style>
            body {{
                background: linear-gradient(135deg, #070913 0%, #0e1329 100%);
                color: #ffffff;
                font-family: 'Inter', -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                overflow: hidden;
            }}
            .loader-box {{
                text-align: center;
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
                padding: 40px 60px;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
            }}
            .spinner {{
                border: 4px solid rgba(255, 255, 255, 0.1);
                width: 50px;
                height: 50px;
                border-radius: 50%;
                border-left-color: #6366f1;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }}
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
            h2 {{
                margin: 0 0 10px 0;
                font-size: 22px;
                font-weight: 600;
                letter-spacing: -0.5px;
            }}
            p {{
                margin: 0;
                color: #94a3b8;
                font-size: 14px;
            }}
        </style>
        <script>
            try {{
                // Save auth tokens & user info exactly as Zustand store expects!
                localStorage.setItem('token', "{token}");
                localStorage.setItem('user', JSON.stringify({user_json}));
                localStorage.setItem('role', "{user.role}");
                console.log("🟢 OAuth login successful. Tokens saved to localStorage.");
                
                // Redirect user to their respective dashboard
                setTimeout(function() {{
                    window.location.href = '/dashboard';
                }}, 600);
            }} catch (e) {{
                console.error("❌ Failed to save OAuth tokens:", e);
                document.getElementById('status-msg').innerText = "Sync failed. Redirecting to login...";
                setTimeout(function() {{
                    window.location.href = '/login?error=sync_failure';
                }}, 2000);
            }}
        </script>
    </head>
    <body>
        <div class="loader-box">
            <div class="spinner"></div>
            <h2 id="status-msg">Syncing Account Telemetry</h2>
            <p>Please wait while we establish a secure session...</p>
        </div>
    </body>
    </html>
    """
    return HttpResponse(html_content, content_type="text/html")
