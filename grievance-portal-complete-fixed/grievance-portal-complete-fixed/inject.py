import os
file_path = r"d:\Freelancing__1\grievance-portal-complete-fixed\grievance-portal-complete-fixed\django_backend\api\views\complaints.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

func_code = """
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
            
        print(f"[AIController] Vision request received via Django. File: {uploaded_file.name} ({uploaded_file.size} bytes)")
        
        # Read the file bytes
        file_bytes = uploaded_file.read()
        
        # Call the Vision service
        result = detect_issue_from_image(file_bytes, mime_type=uploaded_file.content_type, original_name=uploaded_file.name)
        
        if not result.get('success'):
            return JsonResponse({'success': False, 'message': result.get('message', 'AI Vision analysis failed.')}, status=500)
            
        return JsonResponse({
            'success': True,
            'message': 'AI Photo Analysis completed successfully.',
            'data': {
                'is_complaint': result.get('is_complaint'),
                'category': result.get('category'),
                'detectedCategory': result.get('detectedCategory'),
                'confidence': result.get('confidence'),
                'analysis': result.get('analysis'),
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
        print("[AIController] Vision detection failed:", str(e))
        return JsonResponse({'success': False, 'message': f"AI Vision analysis failed: {str(e)}"}, status=500)

"""

# Check if it's already there
if "def detect_complaint_issue_view" not in content:
    target = "@csrf_exempt\n@require_http_methods([\"GET\"])\ndef ip_geolocation_view(request):"
    content = content.replace(target, func_code + target)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Function injected.")
else:
    print("Function already exists.")
