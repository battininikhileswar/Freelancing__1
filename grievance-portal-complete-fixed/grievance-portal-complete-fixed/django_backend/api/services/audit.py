from api.models import AuditLog

def create_audit_log(action, actor_id, actor_role, actor_email, target_id, target_type, details=None, ip_address=None):
    if details is None:
        details = {}
    try:
        log = AuditLog(
            action=action,
            actor={
                'id': actor_id,
                'role': actor_role,
                'email': actor_email
            },
            target={
                'id': target_id,
                'type': target_type
            },
            details=details,
            ip_address=ip_address
        )
        log.save()
    except Exception as e:
        # Fail silently to avoid breaking the core business flows
        print(f"Audit log error: {str(e)}")

def get_audit_logs(limit=50, target_id=None, actor_id=None, action=None):
    try:
        queryset = AuditLog.objects.all().order_by('-created_at')
        if target_id:
            queryset = queryset.filter(target__id=target_id)
        if actor_id:
            queryset = queryset.filter(actor__id=actor_id)
        if action:
            queryset = queryset.filter(action=action)
        return queryset[:limit]
    except Exception as e:
        print(f"Get audit logs error: {str(e)}")
        return []
