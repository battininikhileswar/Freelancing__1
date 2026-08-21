import os
import subprocess

file_path = r"d:\Freelancing__1\grievance-portal-complete-fixed\grievance-portal-complete-fixed\django_backend\api\views\complaints.py"

# 1. Restore the file
subprocess.run(["git", "restore", file_path], check=True)

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 2. Add import
content = content.replace(
    "from firebase_admin import firestore",
    "from firebase_admin import firestore\nfrom api.services.ai import analyze_complaint_comprehensive"
)

# 3. Add file.seek(0)
content = content.replace(
    "                    attachments.append({\n                        'url': upload_res.get('secure_url'),\n                        'publicId': upload_res.get('public_id'),\n                        'type': file.content_type,\n                        'originalName': file.name,\n                        'size': file.size\n                    })",
    "                    attachments.append({\n                        'url': upload_res.get('secure_url'),\n                        'publicId': upload_res.get('public_id'),\n                        'type': file.content_type,\n                        'originalName': file.name,\n                        'size': file.size\n                    })\n                file.seek(0)"
)

# 4. Replace Fallback and add comprehensive analysis block
old_ai_block = """        # Parse aiVisionResult
        ai_metadata = None
        ai_vision_str = data_source.get('aiVisionResult')
        if ai_vision_str:
            try:
                parsed_ai = json.loads(ai_vision_str)
                if parsed_ai.get('isRelevant') is False:
                    return JsonResponse({'success': False, 'message': 'Image does not contain a valid grievance.'}, status=400)
                    
                ai_metadata = {
                    'isComplaint': bool(parsed_ai.get('isRelevant', True)),
                    'detectedIssue': parsed_ai.get('detectedIssue', ''),
                    'category': parsed_ai.get('category', ''),
                    'subcategory': parsed_ai.get('subcategory', ''),
                    'confidence': float(parsed_ai.get('confidence', 0)),
                    'severity': parsed_ai.get('severity', 'medium'),
                    'analysis': parsed_ai.get('analysis', ''),
                    'summary': parsed_ai.get('reason', '')
                }
            except Exception as e:
                print(f"⚠️ [Django] Malformed aiVisionResult: {e}")"""

new_ai_block = """        # Parse initial aiVisionResult to have a fallback
        ai_metadata = None
        ai_vision_str = data_source.get('aiVisionResult')
        if ai_vision_str:
            try:
                parsed_ai = json.loads(ai_vision_str)
                if parsed_ai.get('isComplaint') is False:
                    return JsonResponse({'success': False, 'message': 'Image does not contain a valid grievance.'}, status=400)
                    
                ai_metadata = {
                    'isComplaint': bool(parsed_ai.get('isComplaint', True)),
                    'detectedIssue': parsed_ai.get('detectedIssue', ''),
                    'category': parsed_ai.get('category', ''),
                    'subcategory': parsed_ai.get('subcategory', ''),
                    'confidence': float(parsed_ai.get('confidence', 0)),
                    'severity': parsed_ai.get('severity', 'medium'),
                    'analysis': parsed_ai.get('analysis', ''),
                    'summary': parsed_ai.get('reason', '')
                }
            except Exception as e:
                print(f"[Django] Malformed aiVisionResult: {e}")

        # Final Analysis 2: Image + Description
        if is_multipart and 'attachments' in request.FILES and description:
            try:
                first_file = request.FILES.getlist('attachments')[0]
                if first_file.content_type.startswith('image'):
                    print("[Django] Running Final Comprehensive AI Analysis...")
                    file_bytes = first_file.read()
                    comprehensive_result = analyze_complaint_comprehensive(
                        file_bytes, first_file.content_type, description
                    )
                    
                    if not comprehensive_result.get('isComplaint', True):
                        return JsonResponse({'success': False, 'message': 'AI determined this is not a valid grievance.'}, status=400)
                    
                    ai_metadata = {
                        'isComplaint': comprehensive_result.get('isComplaint', True),
                        'detectedIssue': comprehensive_result.get('detectedIssue', ''),
                        'category': comprehensive_result.get('category', ''),
                        'subcategory': comprehensive_result.get('subcategory', ''),
                        'confidence': float(comprehensive_result.get('confidence', 0.9)),
                        'severity': comprehensive_result.get('severity', 'medium'),
                        'analysis': comprehensive_result.get('reason', ''),
                        'summary': comprehensive_result.get('summary', ''),
                        'department': comprehensive_result.get('department', '')
                    }
                    print("[Django] Final Comprehensive AI Analysis succeeded.")
            except Exception as e:
                print(f"[Django] Comprehensive AI Analysis failed: {e}")
                return JsonResponse({'success': False, 'message': 'AI verification could not be completed. Please try again.'}, status=500)"""

content = content.replace(old_ai_block, new_ai_block)

# 5. Fix detect_complaint_issue_view success check
old_detect = """        # Call the Vision service
        result = detect_issue_from_image(file_bytes, mime_type=uploaded_file.content_type, original_name=uploaded_file.name)
        
        return JsonResponse({
            'success': True,
            'message': 'AI Photo Analysis completed successfully.',"""

new_detect = """        # Call the Vision service
        result = detect_issue_from_image(file_bytes, mime_type=uploaded_file.content_type, original_name=uploaded_file.name)
        
        if not result.get('success'):
            return JsonResponse({'success': False, 'message': result.get('message', 'AI Vision analysis failed.')}, status=500)
            
        return JsonResponse({
            'success': True,
            'message': 'AI Photo Analysis completed successfully.',"""

content = content.replace(old_detect, new_detect)

# 6. Remove remaining emojis
content = content.replace("❌", "")
content = content.replace("⚠️", "")
content = content.replace("✅", "")
content = content.replace("📷", "")
content = content.replace("📡", "")
content = content.replace("🤖", "")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patching completed successfully!")
