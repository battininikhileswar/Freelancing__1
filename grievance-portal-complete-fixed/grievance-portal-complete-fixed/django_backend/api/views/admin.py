import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from api.models import User, Authority, Complaint
from api.middleware.auth import jwt_auth_required, role_required

@csrf_exempt
@jwt_auth_required
@role_required('super_admin')
@require_http_methods(["GET"])
def get_all_users_view(request):
    role = request.GET.get('role')
    state = request.GET.get('state')
    limit = int(request.GET.get('limit', 20))

    queryset = User.objects.all().order_by('-created_at')
    if role:
        queryset = queryset.filter(role=role)
    if state:
        queryset = queryset.filter(state=state.lower())

    users = queryset[:limit]
    data = []
    for u in users:
        data.append({
            'id': u.id,
            'name': u.name,
            'email': u.email,
            'role': u.role,
            'phone': u.phone,
            'state': u.state,
            'district': u.district,
            'complaintsCount': u.complaints_count,
            'isActive': u.is_active,
            'isVerified': u.is_verified,
            'authorityId': u.authority_id,
            'authorityType': u.authority_type,
            'jurisdiction': u.jurisdiction,
            'createdAt': u.created_at.isoformat(),
        })

    return JsonResponse({'success': True, 'data': {'users': data, 'total': queryset.count()}})

@csrf_exempt
@jwt_auth_required
@role_required('super_admin')
@require_http_methods(["POST"])
def create_authority_view(request):
    try:
        body = json.loads(request.body)
    except ValueError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

    name = body.get('name')
    email = body.get('email', '').strip().lower()
    password = body.get('password')
    phone = body.get('phone')
    role = body.get('role')
    authority_type = body.get('authorityType') or role.split('_')[0]
    jurisdiction = body.get('jurisdiction', {})
    authority_id = body.get('authorityId')
    badge_number = body.get('badgeNumber')
    department = body.get('department')

    if not name or not email or not password or not role:
        return JsonResponse({'success': False, 'message': 'Name, email, password, and role are required.'}, status=400)

    if role not in ['ps_officer', 'acb_officer', 'municipal_officer']:
        return JsonResponse({'success': False, 'message': 'Invalid authority role.'}, status=400)

    if User.objects.filter(email=email).exists():
        return JsonResponse({'success': False, 'message': 'Email already registered.'}, status=400)

    try:
        # Normalize jurisdiction districts/state to lower case
        norm_jurisdiction = {
            'state': jurisdiction.get('state', '').lower(),
            'district': jurisdiction.get('district', '').lower(),
            'districts': [d.lower() for d in jurisdiction.get('districts', [])],
        }

        # Create user account for the authority officer
        user = User(
            name=name,
            email=email,
            phone=phone,
            role=role,
            authority_type=authority_type,
            authority_id=authority_id,
            jurisdiction=norm_jurisdiction,
            state=norm_jurisdiction['state'],
            district=norm_jurisdiction['district'],
            is_active=True,
            is_verified=True
        )
        user.set_password(password)
        user.save()

        # If authority ID wasn't explicitly supplied, use user ID
        actual_auth_id = authority_id or user.id
        if not user.authority_id:
            user.authority_id = actual_auth_id
            user.save(update_fields=['authority_id'])

        # Create in Authorities collection
        auth = Authority(
            id=actual_auth_id,
            name=name,
            email=email,
            phone=phone,
            type=authority_type,
            jurisdiction=norm_jurisdiction,
            location=body.get('location', {}),
            is_active=True
        )
        auth.save()

        return JsonResponse({
            'success': True,
            'message': 'Authority account created successfully.',
            'data': {'id': user.id}
        }, status=201)
    except Exception as e:
        return JsonResponse({'success': False, 'message': f"Failed to create authority: {str(e)}"}, status=500)

@csrf_exempt
@jwt_auth_required
@role_required('super_admin')
@require_http_methods(["PUT"])
def toggle_user_status_view(request, id):
    try:
        user = User.objects.get(id=id)
        current = user.is_active
        user.is_active = not current
        user.save(update_fields=['is_active'])
        
        status_str = "activated" if user.is_active else "deactivated"
        return JsonResponse({'success': True, 'message': f"User {status_str} successfully."})
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'User not found.'}, status=404)

@csrf_exempt
@jwt_auth_required
@role_required('super_admin')
@require_http_methods(["GET"])
def get_all_complaints_view(request):
    status = request.GET.get('status')
    category = request.GET.get('category')
    state = request.GET.get('state')
    limit = int(request.GET.get('limit', 50))

    queryset = Complaint.objects.all().order_by('-created_at')
    if status:
        queryset = queryset.filter(status=status)
    if category:
        queryset = queryset.filter(category=category)
    if state:
        queryset = queryset.filter(location__state=state.lower())

    complaints = queryset[:limit]
    data = []
    for c in complaints:
        data.append({
            'id': c.id,
            'complaintId': c.complaint_id,
            'category': c.category,
            'subcategory': c.subcategory,
            'description': c.description,
            'location': c.location,
            'isAnonymous': c.is_anonymous,
            'userId': c.user_id,
            'userName': c.user_name,
            'userEmail': c.user_email,
            'userPhone': c.user_phone,
            'attachments': c.attachments,
            'status': c.status,
            'routing': c.routing,
            'statusHistory': c.status_history,
            'remarks': c.remarks,
            'proofUploads': c.proof_uploads,
            'preferredLanguage': c.preferred_language,
            'escalationLevel': c.escalation_level,
            'escalationDue': c.escalation_due.isoformat() if c.escalation_due else None,
            'isEscalated': c.is_escalated,
            'createdAt': c.created_at.isoformat(),
            'updatedAt': c.updated_at.isoformat(),
        })

    return JsonResponse({'success': True, 'data': {'complaints': data, 'total': queryset.count()}})

@csrf_exempt
@jwt_auth_required
@role_required('super_admin')
@require_http_methods(["PUT"])
def reassign_complaint_view(request, id):
    try:
        complaint = Complaint.objects.get(id=id)
    except Complaint.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Complaint not found.'}, status=404)

    try:
        body = json.loads(request.body)
        new_authority_id = body.get('newAuthorityId')
        reason = body.get('reason', '')
    except ValueError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

    if not new_authority_id:
        return JsonResponse({'success': False, 'message': 'New Authority ID is required.'}, status=400)

    try:
        authority = Authority.objects.get(id=new_authority_id)
    except Authority.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Authority not found.'}, status=404)

    # Perform reassignment
    prev_authority_id = complaint.routing.get('authorityId')
    complaint.routing.update({
        'authorityId': new_authority_id,
        'authorityName': authority.name,
        'reassignedAt': datetime.now().isoformat(),
        'reassignedBy': request.user.id,
        'reassignReason': reason,
        'previousAuthorityId': prev_authority_id,
    })

    status_entry = {
        'status': complaint.status,
        'remarks': f"Complaint reassigned by admin. Reason: {reason}",
        'timestamp': datetime.now().isoformat(),
        'updatedBy': request.user.name,
        'updatedByRole': 'super_admin',
    }
    complaint.status_history.append(status_entry)
    complaint.save()

    return JsonResponse({'success': True, 'message': 'Complaint reassigned successfully.'})

@csrf_exempt
@jwt_auth_required
@role_required('super_admin')
@require_http_methods(["GET"])
def get_all_authorities_view(request):
    auth_type = request.GET.get('type')
    state = request.GET.get('state')

    queryset = Authority.objects.all()
    if auth_type:
        queryset = queryset.filter(type=auth_type)
    if state:
        queryset = queryset.filter(jurisdiction__state=state.lower())

    data = []
    for a in queryset:
        data.append({
            'id': a.id,
            'name': a.name,
            'email': a.email,
            'phone': a.phone,
            'type': a.type,
            'jurisdiction': a.jurisdiction,
            'location': a.location,
            'isActive': a.is_active,
            'createdAt': a.created_at.isoformat() if a.created_at else None,
        })

    return JsonResponse({'success': True, 'data': data})

@csrf_exempt
@jwt_auth_required
@role_required('super_admin')
@require_http_methods(["GET"])
def get_full_analytics_view(request):
    complaints = Complaint.objects.all()
    
    total = complaints.count()
    by_status = {}
    by_category = {}
    by_state = {}
    by_month = {}

    for c in complaints:
        # Status breakdown
        status = c.status
        by_status[status] = by_status.get(status, 0) + 1

        # Category breakdown
        category = c.category
        by_category[category] = by_category.get(category, 0) + 1

        # State breakdown
        state = c.location.get('state', 'unknown')
        by_state[state] = by_state.get(state, 0) + 1

        # Month breakdown
        month = c.created_at.strftime('%Y-%m')
        by_month[month] = by_month.get(month, 0) + 1

    sorted_months = sorted(by_month.items())
    months_data = [{'month': m, 'count': c} for m, c in sorted_months]

    return JsonResponse({
        'success': True,
        'data': {
            'total': total,
            'byStatus': by_status,
            'byCategory': by_category,
            'byState': by_state,
            'byMonth': months_data,
        }
    })
