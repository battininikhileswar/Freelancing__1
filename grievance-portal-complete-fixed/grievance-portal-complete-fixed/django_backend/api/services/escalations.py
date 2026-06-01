from datetime import datetime, timedelta
from django.utils import timezone
from api.models import Complaint
from api.utils.socket_emitter import emit_socket_event

ESCALATION_WINDOWS = {
    0: 72,  # hours before first escalation
    1: 48,  # hours before second escalation
    2: 24,  # hours before third escalation
}

ESCALATION_REMARKS = {
    1: 'Auto-escalated: No action within 72 hours of assignment. Complaint flagged for supervisor review.',
    2: 'Auto-escalated (Level 2): No action within 48 hours of Level 1 escalation. Escalated to state authority.',
    3: 'Auto-escalated (Level 3): Complaint unresolved after maximum escalation window. Admin notified.',
}

def process_escalations():
    now = timezone.now()
    try:
        # Fetch unresolved complaints overdue for escalation
        overdue_complaints = Complaint.objects.filter(
            status__in=['pending', 'under_review', 'investigating'],
            escalation_due__lte=now,
            escalation_level__lt=3
        )
        
        count = 0
        for complaint in overdue_complaints:
            current_level = complaint.escalation_level
            next_level = current_level + 1
            next_window = ESCALATION_WINDOWS.get(next_level, 24)
            next_due = now + timedelta(hours=next_window)

            status_entry = {
                'status': complaint.status,
                'remarks': ESCALATION_REMARKS[next_level],
                'timestamp': datetime.now().isoformat(),
                'updatedBy': 'system',
                'updatedByRole': 'system',
                'isEscalation': True,
                'escalationLevel': next_level,
            }

            complaint.is_escalated = True
            complaint.escalation_level = next_level
            complaint.escalation_due = next_due
            complaint.status_history.append(status_entry)
            complaint.save()

            # Emit real-time alert to authority dashboard
            authority_id = complaint.routing.get('authorityId')
            if authority_id:
                emit_socket_event(
                    event='escalation_alert',
                    data={
                        'complaintId': complaint.complaint_id,
                        'escalationLevel': next_level,
                        'message': ESCALATION_REMARKS[next_level],
                        'timestamp': datetime.now().isoformat(),
                    },
                    room=f"authority_{authority_id}"
                )
            
            count += 1
            
        if count > 0:
            print(f"⚡ Escalation cron: {count} complaints processed")
        return count
    except Exception as e:
        print(f"Escalation processing error: {str(e)}")
        raise e

def manual_escalate(complaint_id, admin_user_id, reason):
    try:
        complaint = Complaint.objects.get(complaint_id=complaint_id)
        current_level = complaint.escalation_level
        next_level = min(current_level + 1, 3)
        next_due = timezone.now() + timedelta(hours=24)

        status_entry = {
            'status': complaint.status,
            'remarks': f"Manually escalated by administrator. Reason: {reason}",
            'timestamp': datetime.now().isoformat(),
            'updatedBy': admin_user_id,
            'updatedByRole': 'super_admin',
            'isEscalation': True,
            'isManual': True,
        }

        complaint.is_escalated = True
        complaint.escalation_level = next_level
        complaint.escalation_due = next_due
        complaint.status_history.append(status_entry)
        complaint.save()

        return complaint.id
    except Complaint.DoesNotExist:
        raise Exception("Complaint not found")
    except Exception as e:
        print(f"Manual escalation error: {str(e)}")
        raise e

def get_escalation_stats():
    try:
        escalated = Complaint.objects.filter(is_escalated=True)
        stats = {
            'total': escalated.count(),
            'byLevel': {1: 0, 2: 0, 3: 0},
            'resolved': 0,
            'pending': 0
        }
        
        for c in escalated:
            level = c.escalation_level
            if level in stats['byLevel']:
                stats['byLevel'][level] += 1
            if c.status == 'closed':
                stats['resolved'] += 1
            else:
                stats['pending'] += 1
                
        return stats
    except Exception as e:
        print(f"Get escalation stats error: {str(e)}")
        return {'total': 0, 'byLevel': {1: 0, 2: 0, 3: 0}, 'resolved': 0, 'pending': 0}
