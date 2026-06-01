import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from api.middleware.auth import jwt_optional_auth
from api.services.ai import generate_claude_completion

@csrf_exempt
@jwt_optional_auth
@require_http_methods(["POST"])
def handle_voice_intent_view(request):
    """
    POST /api/voice/intent
    Processes voice transcript and current context to return a structured JSON action.
    """
    try:
        body = json.loads(request.body)
    except ValueError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

    transcript = body.get('transcript', '')
    current_path = body.get('currentPath', '/')
    user_role = body.get('userRole', 'guest')
    visible_context = body.get('visibleContext', '')

    print(f"🎙️ [VoiceIntent] Transcript: '{transcript}' | Path: '{current_path}' | Role: '{user_role}'")

    if not transcript or transcript.strip() == '':
        return JsonResponse({
            'action': "ASK_CLARIFICATION",
            'target': "",
            'value': "",
            'reply': "Please speak a command.",
            'confidence': 0.0
        })

    system_instruction = (
        "You are the prestigious AI Voice Assistant Intent Engine for the Smart City Issue Tracker (Jan Shakti Portal), operating under the Government of India.\n"
        "Your role is to analyze the user's voice transcript and current page context, and output a strictly formatted JSON action to navigate or control the site with maximum administrative professionalism.\n\n"
        "### Current Page Context:\n"
        f"- Route URL: \"{current_path}\"\n"
        f"- User Role: \"{user_role}\" (Roles: citizen, ps_officer, acb_officer, municipal_officer, super_admin)\n"
        f"- Visible Page Text / Context: \"{visible_context[:1000]}\"\n\n"
        "### Route Mapping Guide:\n"
        "Here are the exact route paths in the application. You must ONLY navigate to these exact paths when action is NAVIGATE:\n"
        "- Home / Landing -> \"/\"\n"
        "- Login -> \"/login\"\n"
        "- Register -> \"/register\"\n"
        "- Citizen Dashboard -> \"/dashboard\"\n"
        "- Admin Dashboard -> \"/admin/dashboard\"\n"
        "- Police Station Dashboard -> \"/ps-dashboard\"\n"
        "- Anti-Corruption Dashboard -> \"/acb-dashboard\"\n"
        "- Municipal Authority Dashboard -> \"/municipal-dashboard\"\n"
        "- Report Issue (Submit Complaint Form) -> \"/submit-complaint\"\n"
        "- Track Complaint -> \"/track\"\n"
        "- Profile / Settings -> \"/profile\"\n"
        "- Emergency Fast Portal -> \"/emergency\"\n"
        "- Map / Interactive Grievances -> \"/map\"\n\n"
        "### Actions & Behavior:\n"
        "1. \"NAVIGATE\": Navigates to a valid route. If they say \"open report page\", \"go to submit\", or \"file a complaint\", target must be \"/submit-complaint\". If they say \"show my complaints\" or \"go to dashboard\", target must be \"/dashboard\" (if citizen) or the correct dashboard for their role.\n"
        "2. \"LOGOUT\": Clears credentials and exits. If they say \"logout\", \"log me out\", or \"sign out\", action must be \"LOGOUT\".\n"
        "3. \"CLICK\": Clicks a button or link. The target should be the text of the button (e.g., \"submit\", \"login\", \"register\").\n"
        "4. \"FILL_FORM\": Fills input fields. The target should be the field name/ID, and value should be the text to fill.\n"
        "5. \"SUBMIT_FORM\": Submits the active form.\n"
        "6. \"SEARCH\": Performs search on the page. Value is the search query.\n"
        "7. \"FILTER\": Filters lists (e.g. pending, resolved, in progress).\n"
        "8. \"READ_PAGE\": Reads visible summary.\n"
        "9. \"ASK_CLARIFICATION\": Used when the query is highly ambiguous, or low confidence, or transcript is unclear.\n"
        "10. \"CHAT\": Conversational helper response.\n\n"
        "### Output JSON Format:\n"
        "You MUST respond strictly in clean JSON format with exactly five fields. Do NOT add markdown, code blocks, or explanations:\n"
        "{\n"
        "  \"action\": \"NAVIGATE | LOGOUT | CLICK | FILL_FORM | SUBMIT_FORM | SEARCH | FILTER | READ_PAGE | ASK_CLARIFICATION | CHAT\",\n"
        "  \"target\": \"matching route, button text, or field name\",\n"
        "  \"value\": \"data to fill or search\",\n"
        "  \"reply\": \"A formal, polite, and professional voice response representing the Government of India. Maximum 1 sentence, 10-15 words. Highly polished, helpful, and authoritative vocabulary. If the user spoke in Telugu, reply in clean, polite Telugu.\",\n"
        "  \"confidence\": 0.95\n"
        "}\n\n"
        "If transcript is unclear, empty, or mumbling, output:\n"
        "{\n"
        "  \"action\": \"ASK_CLARIFICATION\",\n"
        "  \"target\": \"\",\n"
        "  \"value\": \"\",\n"
        "  \"reply\": \"Apologies, I did not catch that query. Could you please repeat your instruction?\",\n"
        "  \"confidence\": 0.1\n"
        "}"
    )

    user_prompt = f"User Transcribed Speech: \"{transcript}\""

    try:
        text = generate_claude_completion(system_instruction, user_prompt, json_mode=True)
        
        try:
            parsed = json.loads(text)
        except Exception:
            import re
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                parsed = json.loads(json_match.group(0))
            else:
                raise ValueError("No JSON block found")

        print("🎙️ [VoiceIntent] Structured action generated:", parsed)
        return JsonResponse(parsed)
    except Exception as e:
        print("❌ [VoiceIntent] Error generating AI intent:", str(e))
        # Simulated diagnostic fallback action
        clean_text = transcript.lower().strip()
        simulated_reply = "Apologies, the voice AI reasoning console is offline."
        action = "ASK_CLARIFICATION"
        target = ""
        
        if 'pothole' in clean_text or 'report' in clean_text or 'file' in clean_text:
            action = "NAVIGATE"
            target = "/submit-complaint"
            simulated_reply = "Redirection to the grievance submission portal initiated."
        elif 'map' in clean_text or 'heatmap' in clean_text:
            action = "NAVIGATE"
            target = "/map"
            simulated_reply = "Opening the interactive grievance telemetry map."
        elif 'dashboard' in clean_text or 'home' in clean_text:
            action = "NAVIGATE"
            target = "/dashboard"
            simulated_reply = "Navigating to your central citizen console."
            
        return JsonResponse({
            'action': action,
            'target': target,
            'value': "",
            'reply': simulated_reply,
            'confidence': 0.5
        })


@csrf_exempt
@require_http_methods(["POST"])
def handle_voice_ai_view(request):
    """
    POST /api/voice-ai
    General conversation voice handler for HeyCity / blind assistant inputs.
    """
    try:
        body = json.loads(request.body)
    except ValueError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

    user_message = body.get('message') or body.get('question')
    print(f"🎙️ [VoiceAI] Received conversational message: '{user_message}'")

    if not user_message or user_message.strip() == '':
        return JsonResponse({'reply': "Please say something."})

    clean_text = user_message.lower().strip()

    # Fast instant greetings
    if clean_text in ['hi', 'hello', 'hey']:
        return JsonResponse({'reply': "Hi, how can I help?"})
    elif clean_text == 'how are you':
        return JsonResponse({'reply': "I'm doing great, thank you."})
    elif clean_text in ['thank you', 'thanks']:
        return JsonResponse({'reply': "You're welcome."})
    elif clean_text == 'ok':
        return JsonResponse({'reply': "Okay."})

    system_instruction = (
        "You are the prestigious, highly professional administrative Voice Assistant "
        "for the Smart City Issue Tracker (Jan Shakti Portal), operating under the Government of India.\n"
        "Provide exceeding formal, polite, helpful, and authoritative vocal responses.\n"
        "Max 1 concise sentence of 10-15 words. Mix polite Telugu if citizen speaks in Telugu."
    )

    try:
        reply_text = generate_claude_completion(system_instruction, user_message, json_mode=False)
        return JsonResponse({'reply': reply_text})
    except Exception as e:
        print("❌ [VoiceAI] Error generating voice reply:", str(e))
        return JsonResponse({'reply': "Apologies, the voice AI brain encountered a transient connection issue. Please retry."})
