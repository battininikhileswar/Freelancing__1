import json
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from api.models import Complaint, User
from api.middleware.auth import jwt_optional_auth, jwt_auth_required, role_required
from api.services.routing import route_complaint
from api.utils.helpers import generate_complaint_id
from api.utils.cloudinary_upload import upload_file_to_cloudinary
from api.utils.notifications import notify_complaint_submitted, notify_status_change
from api.utils.socket_emitter import emit_socket_event

@csrf_exempt
@jwt_optional_auth
@require_http_methods(["POST"])
def submit_complaint_view(request):
    # Support both json and multipart/form-data
    is_multipart = request.content_type.startswith('multipart/form-data')
    
    if is_multipart:
        data_source = request.POST
    else:
        try:
            data_source = json.loads(request.body)
        except ValueError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

    category = data_source.get('category')
    subcategory = data_source.get('subcategory', '')
    description = data_source.get('description', '')
    preferred_language = data_source.get('preferredLanguage', 'en')
    is_anonymous_val = data_source.get('isAnonymous')
    
    # Parse isAnonymous
    is_anonymous = is_anonymous_val == True or is_anonymous_val == 'true'

    if not is_anonymous and not request.user:
        return JsonResponse({'success': False, 'message': 'Authentication required for non-anonymous submissions.'}, status=401)

    location_data = data_source.get('location')
    if isinstance(location_data, str):
        try:
            location_data = json.loads(location_data)
        except ValueError:
            return JsonResponse({'success': False, 'message': 'Invalid location data format'}, status=400)
            
    if not location_data:
        return JsonResponse({'success': False, 'message': 'Location data is required'}, status=400)

    try:
        # Route to appropriate authority
        routing = route_complaint(category, subcategory, location_data)
        complaint_id = generate_complaint_id(category, location_data.get('state'))
        
        # Handle file attachments
        attachments = []
        if is_multipart and 'attachments' in request.FILES:
            files = request.FILES.getlist('attachments')
            for file in files:
                folder = f"grievance-portal/complaints/{complaint_id}"
                res_type = 'video' if file.content_type.startswith('video') else 'image'
                upload_res = upload_file_to_cloudinary(file, folder=folder, resource_type=res_type)
                if upload_res:
                    attachments.append({
                        'url': upload_res.get('secure_url'),
                        'publicId': upload_res.get('public_id'),
                        'type': file.content_type,
                        'originalName': file.name,
                        'size': file.size
                    })

        escalation_due_date = timezone.now() + timedelta(hours=72)
        
        complaint = Complaint(
            complaint_id=complaint_id,
            category=category,
            subcategory=subcategory,
            description=description,
            location={
                'address': location_data.get('address', ''),
                'state': str(location_data.get('state', '')).lower(),
                'district': str(location_data.get('district', '')).lower(),
                'pincode': location_data.get('pincode', ''),
                'lat': float(location_data.get('lat')) if location_data.get('lat') is not None else None,
                'lng': float(location_data.get('lng')) if location_data.get('lng') is not None else None,
            },
            is_anonymous=is_anonymous,
            user_id=None if is_anonymous else request.user.id,
            user_name='Anonymous' if is_anonymous else request.user.name,
            user_email=None if is_anonymous else request.user.email,
            user_phone=None if is_anonymous else request.user.phone,
            attachments=attachments,
            status='pending',
            routing={
                'authorityId': routing.get('authorityId'),
                'authorityType': routing.get('authorityType'),
                'authorityName': routing.get('authorityName'),
                'assignedAt': datetime.now().isoformat(),
            },
            status_history=[{
                'status': 'pending',
                'remarks': 'Complaint registered and routed to authority.',
                'timestamp': datetime.now().isoformat(),
                'updatedBy': 'system',
            }],
            remarks=[],
            proof_uploads=[],
            preferred_language=preferred_language,
            escalation_level=0,
            escalation_due=escalation_due_date,
            is_escalated=False
        )
        complaint.save()

        # Update user's complaints count
        if not is_anonymous and request.user:
            request.user.complaints_count += 1
            request.user.save(update_fields=['complaints_count'])

        # Notify user
        notify_complaint_submitted(request.user, complaint)

        # Notify authority via websocket
        auth_id = routing.get('authorityId')
        if auth_id:
            emit_socket_event(
                event='new_complaint_assigned',
                data={'complaintId': complaint.complaint_id, 'id': complaint.id},
                room=f"authority_{auth_id}"
            )

        return JsonResponse({
            'success': True,
            'message': 'Complaint submitted successfully. Please save your Complaint ID.',
            'data': {
                'id': complaint.id,
                'complaintId': complaint.complaint_id,
                'status': 'pending',
                'authorityType': routing.get('authorityType'),
                'estimatedResolutionTime': '7-14 working days'
            }
        }, status=201)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'message': f"Submission failed: {str(e)}"}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def track_complaint_view(request, complaintId):
    try:
        complaint = Complaint.objects.get(complaint_id=complaintId)
        return JsonResponse({
            'success': True,
            'data': {
                'complaintId': complaint.complaint_id,
                'category': complaint.category,
                'subcategory': complaint.subcategory,
                'status': complaint.status,
                'location': {
                    'state': complaint.location.get('state'),
                    'district': complaint.location.get('district'),
                },
                'statusHistory': complaint.status_history,
                'remarks': complaint.remarks,
                'createdAt': complaint.created_at.isoformat(),
                'updatedAt': complaint.updated_at.isoformat(),
                'authorityType': complaint.routing.get('authorityType'),
            }
        })
    except Complaint.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Complaint not found. Please check your Complaint ID.'}, status=404)

@csrf_exempt
@jwt_auth_required
@role_required('citizen')
@require_http_methods(["GET"])
def get_my_complaints_view(request):
    status_filter = request.GET.get('status')
    category_filter = request.GET.get('category')
    limit = int(request.GET.get('limit', 10))
    page = int(request.GET.get('page', 1))

    queryset = Complaint.objects.filter(user_id=request.user.id).order_by('-created_at')

    if status_filter:
        queryset = queryset.filter(status=status_filter)
    if category_filter:
        queryset = queryset.filter(category=category_filter)

    total = queryset.count()
    start = (page - 1) * limit
    end = start + limit
    complaints = queryset[start:end]

    data = []
    for c in complaints:
        desc = c.description
        data.append({
            'id': c.id,
            'complaintId': c.complaint_id,
            'category': c.category,
            'subcategory': c.subcategory,
            'description': desc[:150] + '...' if len(desc) > 150 else desc,
            'status': c.status,
            'location': {
                'state': c.location.get('state'),
                'district': c.location.get('district')
            },
            'attachments': len(c.attachments) if c.attachments else 0,
            'createdAt': c.created_at.isoformat(),
            'updatedAt': c.updated_at.isoformat(),
        })

    return JsonResponse({
        'success': True,
        'data': {
            'complaints': data,
            'total': total,
            'page': page
        }
    })

@csrf_exempt
@jwt_auth_required
@require_http_methods(["GET"])
def get_complaint_detail_view(request, id):
    try:
        complaint = Complaint.objects.get(id=id)
    except Complaint.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Complaint not found.'}, status=404)

    # Access control
    user = request.user
    if user.role == 'citizen' and complaint.user_id != user.id:
        return JsonResponse({'success': False, 'message': 'Access denied.'}, status=403)
        
    if user.role in ['ps_officer', 'acb_officer', 'municipal_officer', 'fire_officer', 'hospital_officer']:
        if complaint.routing.get('authorityId') != user.authority_id:
            return JsonResponse({'success': False, 'message': 'This complaint is not assigned to your authority.'}, status=403)

    return JsonResponse({
        'success': True,
        'data': {
            'id': complaint.id,
            'complaintId': complaint.complaint_id,
            'category': complaint.category,
            'subcategory': complaint.subcategory,
            'description': complaint.description,
            'location': complaint.location,
            'isAnonymous': complaint.is_anonymous,
            'userId': complaint.user_id,
            'userName': complaint.user_name,
            'userEmail': complaint.user_email,
            'userPhone': complaint.user_phone,
            'attachments': complaint.attachments,
            'status': complaint.status,
            'routing': complaint.routing,
            'statusHistory': complaint.status_history,
            'remarks': complaint.remarks,
            'proofUploads': complaint.proof_uploads,
            'preferredLanguage': complaint.preferred_language,
            'escalationLevel': complaint.escalation_level,
            'escalationDue': complaint.escalation_due.isoformat() if complaint.escalation_due else None,
            'isEscalated': complaint.is_escalated,
            'createdAt': complaint.created_at.isoformat(),
            'updatedAt': complaint.updated_at.isoformat(),
            'closedAt': complaint.closed_at.isoformat() if complaint.closed_at else None
        }
    })

@csrf_exempt
@jwt_auth_required
@role_required('ps_officer', 'acb_officer', 'municipal_officer', 'fire_officer', 'hospital_officer', 'super_admin')
@require_http_methods(["GET"])
def get_assigned_complaints_view(request):
    status_filter = request.GET.get('status')
    limit = int(request.GET.get('limit', 20))
    
    authority_id = request.user.authority_id
    if not authority_id and request.user.role == 'super_admin':
        # Super admin sees all
        queryset = Complaint.objects.all().order_by('-created_at')
    elif not authority_id:
        return JsonResponse({'success': False, 'message': 'Authority ID not configured for this account.'}, status=400)
    else:
        # Standard authority
        queryset = Complaint.objects.filter(routing__authorityId=authority_id).order_by('-created_at')

    if status_filter:
        queryset = queryset.filter(status=status_filter)

    total = queryset.count()
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
            'closedAt': c.closed_at.isoformat() if c.closed_at else None
        })

    return JsonResponse({'success': True, 'data': {'complaints': data, 'total': total}})

@csrf_exempt
@jwt_auth_required
@role_required('ps_officer', 'acb_officer', 'municipal_officer', 'fire_officer', 'hospital_officer', 'super_admin')
@require_http_methods(["PUT"])
def update_complaint_status_view(request, id):
    try:
        complaint = Complaint.objects.get(id=id)
    except Complaint.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Complaint not found.'}, status=404)

    user = request.user
    if user.role in ['ps_officer', 'acb_officer', 'municipal_officer', 'fire_officer', 'hospital_officer']:
        if complaint.routing.get('authorityId') != user.authority_id:
            return JsonResponse({'success': False, 'message': 'Not authorized to update this complaint.'}, status=403)

    is_multipart = request.content_type.startswith('multipart/form-data')
    if is_multipart:
        from django.http.multipartparser import MultiPartParser as DjangoMultiPartParser
        parser = DjangoMultiPartParser(request.META, request, request.upload_handlers)
        post_data, file_data = parser.parse()
        status = post_data.get('status')
        remarks = post_data.get('remarks', '')
        files_dict = file_data
    else:
        try:
            body = json.loads(request.body)
            status = body.get('status')
            remarks = body.get('remarks', '')
        except ValueError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
        files_dict = {}

    if not status:
        return JsonResponse({'success': False, 'message': 'Status is required.'}, status=400)

    # Handle proof file uploads
    proof_uploads = []
    if is_multipart and 'proofs' in files_dict:
        files = files_dict.getlist('proofs')
        for file in files:
            folder = f"grievance-portal/proofs/{complaint.complaint_id}"
            upload_res = upload_file_to_cloudinary(file, folder=folder)
            if upload_res:
                proof_uploads.append({
                    'url': upload_res.get('secure_url'),
                    'publicId': upload_res.get('public_id'),
                    'type': file.content_type
                })

    status_entry = {
        'status': status,
        'remarks': remarks,
        'timestamp': datetime.now().isoformat(),
        'updatedBy': user.name if hasattr(user, 'name') else user.first_name,
        'updatedByRole': user.role,
    }

    complaint.status = status
    complaint.status_history.append(status_entry)
    
    if remarks:
        complaint.remarks.append({
            'text': remarks,
            'timestamp': datetime.now().isoformat(),
            'by': user.name if hasattr(user, 'name') else user.first_name
        })

    if proof_uploads:
        complaint.proof_uploads.extend(proof_uploads)

    if status == 'closed':
        complaint.closed_at = timezone.now()

    complaint.save()

    # Notify user
    if not complaint.is_anonymous and complaint.user_id:
        try:
            citizen = User.objects.get(id=complaint.user_id)
            notify_status_change(citizen, complaint)
        except User.DoesNotExist:
            pass

    # Emit Socket event
    emit_socket_event(
        event='status_updated',
        data={'complaintId': complaint.id, 'status': status, 'remarks': remarks},
        room=f"complaint_{id}"
    )

    return JsonResponse({'success': True, 'message': 'Status updated successfully.'})

@csrf_exempt
@jwt_auth_required
@role_required('super_admin')
@require_http_methods(["GET"])
def get_analytics_view(request):
    total = Complaint.objects.count()
    pending = Complaint.objects.filter(status='pending').count()
    closed = Complaint.objects.filter(status='closed').count()
    
    crime = Complaint.objects.filter(category='crime').count()
    corruption = Complaint.objects.filter(category='corruption').count()
    civic_issue = Complaint.objects.filter(category='civic_issue').count()
    fire = Complaint.objects.filter(category='fire').count()
    hospital = Complaint.objects.filter(category='hospital').count()

    return JsonResponse({
        'success': True,
        'data': {
            'total': total,
            'pending': pending,
            'closed': closed,
            'byCategory': {
                'crime': crime,
                'corruption': corruption,
                'civic_issue': civic_issue,
                'fire': fire,
                'hospital': hospital,
            }
        }
    })


@csrf_exempt
@require_http_methods(["GET"])
def get_heatmap_data_view(request):
    try:
        complaints = Complaint.objects.all()
        points = []
        for c in complaints:
            loc = c.location if c.location else {}
            lat = loc.get('lat')
            lng = loc.get('lng')
            if lat is not None and lng is not None:
                try:
                    points.append({
                        'id': c.id,
                        'complaintId': c.complaint_id,
                        'lat': float(lat),
                        'lng': float(lng),
                        'category': c.category,
                        'severity': loc.get('severity', 'Medium'),
                        'status': c.status,
                        'address': loc.get('address', 'N/A')
                    })
                except (ValueError, TypeError):
                    pass
        return JsonResponse({'success': True, 'data': points})
    except Exception as e:
        print("❌ [heatmapView] Error:", str(e))
        return JsonResponse({'success': False, 'message': 'Failed to retrieve heatmap data'}, status=500)


@csrf_exempt
@jwt_optional_auth
@require_http_methods(["POST"])
def detect_complaint_issue_view(request):
    from api.services.ai import detect_issue_from_image
    try:
        # Verify file was uploaded
        if 'image' not in request.FILES:
            return JsonResponse({'success': False, 'message': 'No photo uploaded. Please attach a valid image file (form field: "image").'}, status=400)
        
        uploaded_file = request.FILES['image']
        
        # Validate mime type starts with image/
        if not uploaded_file.content_type.startswith('image/'):
            return JsonResponse({'success': False, 'message': 'Invalid file type. Only image files (JPEG, PNG, WEBP) are supported.'}, status=400)
            
        print(f"📷 [AIController] Vision request received via Django. File: {uploaded_file.name} ({uploaded_file.size} bytes)")
        
        # Read the file bytes
        file_bytes = uploaded_file.read()
        
        # Call the Vision service
        result = detect_issue_from_image(file_bytes, mime_type=uploaded_file.content_type, original_name=uploaded_file.name)
        
        return JsonResponse({
            'success': True,
            'message': 'AI Photo Analysis completed successfully.',
            'data': {
                'detectedCategory': result.get('detectedCategory'),
                'confidence': result.get('confidence'),
                'reason': result.get('reason'),
                'severity': result.get('severity'),
                'severityReason': result.get('severityReason'),
                'mappedCategory': result.get('mappedCategory'),
                'mappedSubcategory': result.get('mappedSubcategory')
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("❌ [AIController] Vision detection failed:", str(e))
        return JsonResponse({'success': False, 'message': f"AI Vision analysis failed: {str(e)}"}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def ip_geolocation_view(request):
    import requests
    try:
        # Extract client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            client_ip = x_forwarded_for.split(',')[0].strip()
        else:
            client_ip = request.META.get('REMOTE_ADDR')
            
        print(f"📡 [IP-GeoProxy] Incoming request. Client IP: {client_ip}")
        
        # If client_ip is local loopback (e.g. 127.0.0.1 or ::1), let ipwho.is auto-detect the gateway IP
        is_local = client_ip in ['127.0.0.1', '::1', 'localhost']
        
        # 1. TIER 1 Fallback: ipwho.is
        try:
            ipwhois_url = "https://ipwho.is/" if is_local else f"https://ipwho.is/{client_ip}"
            print(f"📡 [IP-GeoProxy] [TIER 1] Calling ipwho.is for IP: {client_ip if not is_local else 'local-gateway'}")
            res = requests.get(ipwhois_url, timeout=8)
            if res.status_code == 200:
                data = res.json()
                if data.get('success'):
                    print(f"✅ [IP-GeoProxy] [TIER 1] ipwho.is succeeded. Location: {data.get('city')}, {data.get('region')}")
                    return JsonResponse({
                        'success': True,
                        'source': 'ipwhois',
                        'data': {
                            'latitude': float(data.get('latitude')),
                            'longitude': float(data.get('longitude')),
                            'city': data.get('city'),
                            'region': data.get('region'),
                            'pincode': data.get('postal', '')
                        }
                    })
                else:
                    print(f"⚠️ [IP-GeoProxy] [TIER 1] ipwho.is returned failure in response: {data.get('message')}")
            else:
                print(f"⚠️ [IP-GeoProxy] [TIER 1] ipwho.is failed with status {res.status_code}")
        except Exception as e:
            print(f"❌ [IP-GeoProxy] [TIER 1] ipwho.is error: {str(e)}")

        # 2. TIER 2 Fallback: ipinfo.io
        try:
            ipinfo_url = "https://ipinfo.io/json" if is_local else f"https://ipinfo.io/{client_ip}/json"
            print(f"📡 [IP-GeoProxy] [TIER 2] Calling ipinfo.io for IP: {client_ip if not is_local else 'local-gateway'}")
            res = requests.get(ipinfo_url, timeout=8)
            if res.status_code == 200:
                data = res.json()
                loc = data.get('loc', '')
                if loc:
                    lat, lng = loc.split(',')
                    print(f"✅ [IP-GeoProxy] [TIER 2] ipinfo.io succeeded. Location: {data.get('city')}, {data.get('region')}")
                    return JsonResponse({
                        'success': True,
                        'source': 'ipinfo',
                        'data': {
                            'latitude': float(lat),
                            'longitude': float(lng),
                            'city': data.get('city'),
                            'region': data.get('region'),
                            'pincode': data.get('postal', '')
                        }
                    })
            else:
                print(f"⚠️ [IP-GeoProxy] [TIER 2] ipinfo.io failed with status {res.status_code}")
        except Exception as e:
            print(f"❌ [IP-GeoProxy] [TIER 2] ipinfo.io error: {str(e)}")

        return JsonResponse({'success': False, 'message': 'All IP geolocation fallback proxy tiers failed.'}, status=500)
    except Exception as e:
        print("❌ [IP-GeoProxy] Fatal error:", str(e))
        return JsonResponse({'success': False, 'message': f"Proxy geolocation error: {str(e)}"}, status=500)
