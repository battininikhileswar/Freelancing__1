from django.urls import path
from django.http import JsonResponse
from api.views.auth import (
    register_view, login_view, google_login_view, google_oauth_success_view, refresh_token_view, profile_view,
    change_password_view, notifications_view, mark_all_notifications_read_view,
    mark_notification_read_view
)
from api.views.complaints import (
    submit_complaint_view, track_complaint_view, get_my_complaints_view,
    get_complaint_detail_view, get_assigned_complaints_view,
    update_complaint_status_view, get_analytics_view, get_heatmap_data_view,
    detect_complaint_issue_view
)
from api.views.admin import (
    get_all_users_view, create_authority_view, toggle_user_status_view,
    get_all_complaints_view, reassign_complaint_view, get_all_authorities_view,
    get_full_analytics_view
)
from api.views.escalations import escalation_handler_view
from api.views.chatbot import (
    send_chat_message_view, get_chat_history_view, clear_chat_history_view,
    get_suggestion_for_complaint_view, get_chatbot_status_view
)
from api.views.voice import handle_voice_intent_view, handle_voice_ai_view

def health_check(request):
    import datetime
    return JsonResponse({
        'success': True,
        'message': 'Grievance Portal API is running.',
        'timestamp': datetime.datetime.now().isoformat(),
        'version': '1.0.0'
    })

def custom_authorities_dispatcher(request):
    if request.method == 'POST':
        return create_authority_view(request)
    return get_all_authorities_view(request)

urlpatterns = [
    # Health Check
    path('health', health_check),

    # Auth routes
    path('auth/register', register_view),
    path('auth/login', login_view),
    path('auth/google-login', google_login_view),
    path('auth/oauth-success', google_oauth_success_view),
    path('auth/refresh', refresh_token_view),
    path('auth/profile', profile_view),
    path('auth/change-password', change_password_view),
    path('auth/notifications', notifications_view),
    path('auth/notifications/read-all', mark_all_notifications_read_view),
    path('auth/notifications/<str:id>/read', mark_notification_read_view),

    # Complaints routes
    path('complaints', submit_complaint_view),
    path('complaints/detect-issue', detect_complaint_issue_view),
    path('complaints/track/<str:complaintId>', track_complaint_view),
    path('complaints/my', get_my_complaints_view),
    path('complaints/authority/assigned', get_assigned_complaints_view),
    path('complaints/admin/analytics', get_analytics_view),
    path('complaints/heatmap', get_heatmap_data_view),
    path('complaints/<str:id>', get_complaint_detail_view),
    path('complaints/<str:id>/status', update_complaint_status_view),

    # Admin routes
    path('admin/users', get_all_users_view),
    path('admin/authorities', custom_authorities_dispatcher),
    path('admin/users/<str:id>/toggle', toggle_user_status_view),
    path('admin/complaints', get_all_complaints_view),
    path('admin/complaints/<str:id>/reassign', reassign_complaint_view),
    path('admin/escalations/stats', escalation_handler_view),
    path('admin/escalations/manual', escalation_handler_view),
    path('admin/analytics', get_full_analytics_view),

    # Chatbot & Voice routes
    path('chatbot/message', send_chat_message_view),
    path('chat', send_chat_message_view),
    path('chatbot/history', get_chat_history_view),
    path('chatbot/suggest', get_suggestion_for_complaint_view),
    path('chatbot/status', get_chatbot_status_view),
    path('voice/intent', handle_voice_intent_view),
    path('voice-ai', handle_voice_ai_view),
]
