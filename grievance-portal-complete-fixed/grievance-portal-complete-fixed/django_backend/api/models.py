from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
import uuid

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'super_admin')
        extra_fields.setdefault('state', 'andhra pradesh')
        extra_fields.setdefault('district', 'guntur')
        
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    id = models.CharField(primary_key=True, max_length=100, editable=False)
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=50, default='citizen') # citizen, ps_officer, acb_officer, municipal_officer, super_admin
    phone = models.CharField(max_length=20, null=True, blank=True)
    state = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    complaints_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    authority_id = models.CharField(max_length=100, null=True, blank=True)
    authority_type = models.CharField(max_length=50, null=True, blank=True)
    jurisdiction = models.JSONField(null=True, blank=True) # { state, district, districts: [] }
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"users-{uuid.uuid4().hex[:12]}"
        # Ensure username matches email for Django compatibility
        if not self.username:
            self.username = self.email
        super().save(*args, **kwargs)


class Authority(models.Model):
    id = models.CharField(primary_key=True, max_length=100)
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    type = models.CharField(max_length=50) # ps, acb, municipal
    jurisdiction = models.JSONField(null=True, blank=True) # { state, district, districts: [] }
    location = models.JSONField(null=True, blank=True) # { lat, lng }
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"authorities-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)


class Complaint(models.Model):
    id = models.CharField(primary_key=True, max_length=100)
    complaint_id = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=100) # crime, corruption, civic_issue
    subcategory = models.CharField(max_length=100, blank=True)
    description = models.TextField()
    location = models.JSONField() # { address, state, district, pincode, lat, lng }
    is_anonymous = models.BooleanField(default=False)
    user_id = models.CharField(max_length=100, null=True, blank=True)
    user_name = models.CharField(max_length=200, default='Anonymous')
    user_email = models.EmailField(null=True, blank=True)
    user_phone = models.CharField(max_length=20, null=True, blank=True)
    attachments = models.JSONField(default=list, blank=True) # list of { url, publicId, type, originalName, size }
    status = models.CharField(max_length=50, default='pending')
    routing = models.JSONField() # { authorityId, authorityType, authorityName, assignedAt }
    status_history = models.JSONField(default=list, blank=True)
    remarks = models.JSONField(default=list, blank=True)
    proof_uploads = models.JSONField(default=list, blank=True)
    preferred_language = models.CharField(max_length=10, default='en')
    escalation_level = models.IntegerField(default=0)
    escalation_due = models.DateTimeField()
    is_escalated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"complaints-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)


class Notification(models.Model):
    id = models.CharField(primary_key=True, max_length=100)
    user_id = models.CharField(max_length=100)
    type = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    message = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"notifications-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)


class AuditLog(models.Model):
    id = models.CharField(primary_key=True, max_length=100)
    action = models.CharField(max_length=100)
    actor = models.JSONField() # { id, role, email }
    target = models.JSONField() # { id, type }
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"audit_logs-{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)
