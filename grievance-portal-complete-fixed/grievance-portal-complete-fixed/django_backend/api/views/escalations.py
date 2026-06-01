import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from api.middleware.auth import jwt_auth_required, role_required
from api.services.escalations import get_escalation_stats, manual_escalate

@csrf_exempt
@jwt_auth_required
@role_required('super_admin')
@require_http_methods(["GET", "POST"])
def escalation_handler_view(request):
    if request.method == 'GET':
        try:
            stats = get_escalation_stats()
            return JsonResponse({'success': True, 'data': stats})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
    
    elif request.method == 'POST':
        try:
            body = json.loads(request.body)
            complaint_id = body.get('complaintId')
            reason = body.get('reason')
        except ValueError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

        if not complaint_id or not reason:
            return JsonResponse({'success': False, 'message': 'complaintId and reason required'}, status=400)

        try:
            id = manual_escalate(complaint_id, request.user.id, reason)
            return JsonResponse({'success': True, 'message': 'Complaint escalated.', 'data': {'id': id}})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
