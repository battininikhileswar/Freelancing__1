import os
import time
import json
import requests
from django.conf import settings

# In-memory storage for chatbot conversation history
conversation_history = {}

# Simple in-memory query cache to avoid calling LLM APIs for identical repeat inputs
query_cache = {}

def generate_claude_completion(system_instruction, user_prompt, json_mode=False):
    """
    Cognitive completion service that queries Anthropic Sonnet first,
    falling back transparently to Groq Llama 3.3/3.1 if Anthropic credits are exhausted.
    """
    anthropic_key = os.getenv('ANTHROPIC_API_KEY')
    groq_key = os.getenv('GROQ_API_KEY')

    # 1. Try Anthropic Claude sonnet/haiku
    if anthropic_key:
        models = [
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022'
        ]
        
        for model in models:
            try:
                print(f"🤖 [aiService] Querying Claude model: {model}...")
                payload = {
                    'model': model,
                    'max_tokens': 450 if json_mode else 250,
                    'system': system_instruction,
                    'messages': [
                        {'role': 'user', 'content': user_prompt}
                    ],
                    'temperature': 0.1
                }
                
                headers = {
                    'x-api-key': anthropic_key,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                }
                
                response = requests.post(
                    'https://api.anthropic.com/v1/messages',
                    json=payload,
                    headers=headers,
                    timeout=20
                )
                
                if response.status_code == 200:
                    data = response.json()
                    text = data.get('content', [{}])[0].get('text', '')
                    if text:
                        print(f"✅ [aiService] Successfully generated content using Claude {model}")
                        return text.strip()
                else:
                    try:
                        err_data = response.json()
                    except ValueError:
                        err_data = {}
                    
                    err_msg = err_data.get('error', {}).get('message', '')
                    print(f"⚠️ Claude model {model} returned error status {response.status_code}: {err_msg}")
                    if 'credit balance' in err_msg.lower() or 'billing' in err_msg.lower():
                        print("🚨 Anthropic key is out of credits. Shifting to Groq fallback.")
                        break
            except Exception as e:
                print(f"⚠️ [aiService] Claude model {model} connection failed: {str(e)}")

    # 2. Fall back to Groq Llama 3.3/3.1
    if groq_key:
        print("🤖 [aiService] Claude unavailable or out of credits. Falling back to Groq...")
        groq_models = [
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant'
        ]
        
        for model_name in groq_models:
            try:
                print(f"🤖 [aiService] Querying Groq model: {model_name}...")
                messages = []
                if system_instruction:
                    messages.append({'role': 'system', 'content': system_instruction})
                messages.append({'role': 'user', 'content': user_prompt})
                
                payload = {
                    'model': model_name,
                    'messages': messages,
                    'max_tokens': 450 if json_mode else 250,
                    'temperature': 0.2
                }
                
                if json_mode:
                    payload['response_format'] = {"type": "json_object"}
                
                headers = {
                    'Authorization': f'Bearer {groq_key}',
                    'Content-Type': 'application/json'
                }
                
                response = requests.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    json=payload,
                    headers=headers,
                    timeout=20
                )
                
                if response.status_code == 200:
                    data = response.json()
                    text = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                    if text:
                        print(f"✅ [aiService] Successfully generated fallback content using Groq {model_name}")
                        return text.strip()
                else:
                    try:
                        err_data = response.json()
                    except ValueError:
                        err_data = {}
                    print(f"⚠️ Groq model {model_name} returned error status {response.status_code}: {err_data.get('error', {}).get('message', '')}")
            except Exception as e:
                print(f"⚠️ [aiService] Groq model {model_name} connection failed: {str(e)}")

    # 3. Raise error if everything fails
    raise RuntimeError("All Anthropic Claude and Groq fallback models failed")


def send_chat_message(user_message, user_id='anonymous', mode='chat'):
    """
    Formulates a friendly, government-aligned Smart City support response using LLM models.
    """
    clean_text = user_message.lower().strip()

    # Cache hit check
    if clean_text in query_cache:
        print(f"🚀 [aiService] Cache hit for query: '{user_message}'")
        return query_cache[clean_text]

    # Initialize chat history if not exists
    if user_id not in conversation_history:
        conversation_history[user_id] = []
    
    history = conversation_history[user_id]

    system_instruction = (
        "You are the prestigious, highly professional administrative Conversational Chatbot Assistant "
        "for the Smart City Issue Tracker (Jan Shakti Portal), operating under the Government of India.\n"
        "Represent the portal with the highest standards of decorum, polite efficiency, and formal administrative language.\n"
        "Follow these rules strictly:\n"
        "1. Tone: Exceedingly professional, polite, helpful, and authoritative.\n"
        "2. Response length: 1 to 2 concise, polished sentences. Max 25-30 words.\n"
        "3. Language: Mix clean, polite Telugu when the citizen writes in Telugu.\n"
        "4. Navigating Guidance: If the user requests to perform an action (such as logging in, registering, "
        "viewing the heatmap, or submitting a grievance), politely explain how they can perform it manually "
        "(e.g., by selecting the 'LOGIN' or 'REGISTER' buttons on the top right navigation bar).\n"
        "5. Shortcut Command Triggers: Tautly inform them they can also input clean text commands "
        "(such as 'login', 'register', 'map', 'home', or 'dashboard') directly into this text terminal "
        "for automated redirection.\n"
        "6. Decoupled Experience: Keep text conversational assistance completely decoupled from the voice assistant. "
        "Do NOT direct users to voice buttons."
    )

    # Format recent exchanges into user prompt to preserve context
    recent_history = history[-4:]
    context_prompts = []
    for exchange in recent_history:
        context_prompts.append(f"Citizen: {exchange.get('userMessage')}")
        context_prompts.append(f"Assistant: {exchange.get('assistantResponse')}")
    
    context_prompts.append(f"Citizen: {user_message}")
    user_prompt = "\n".join(context_prompts)

    try:
        reply_text = generate_claude_completion(system_instruction, user_prompt, json_mode=False)
        
        # Save to session history
        history.append({
            'userMessage': user_message,
            'assistantResponse': reply_text,
            'timestamp': time.time()
        })
        
        # Keep only latest 10 messages to manage memory
        if len(history) > 10:
            conversation_history[user_id] = history[-10:]
            
        # Cache successful response
        query_cache[clean_text] = reply_text
        return reply_text
    except Exception as e:
        print(f"❌ [aiService] Error in chatbot processing: {str(e)}")
        raise e


def get_conversation_history(user_id='anonymous'):
    """
    Retrieves the local session history list.
    """
    return conversation_history.get(user_id, [])


def clear_conversation_history(user_id='anonymous'):
    """
    Clears the local session history list.
    """
    if user_id in conversation_history:
        conversation_history[user_id] = []


def map_category(detected):
    clean_detected = str(detected or '').lower().strip()
    # Normalize corruption/bribery variations
    if 'corruption' in clean_detected or 'briber' in clean_detected:
        clean_detected = 'corruption_bribery'

    if clean_detected in ['pothole', 'road_damage', 'road crack']:
        return {'category': 'civic_issue', 'subcategory': 'road_damage'}
    elif clean_detected in ['garbage', 'garbage_waste', 'illegal_dumping']:
        return {'category': 'civic_issue', 'subcategory': 'garbage'}
    elif clean_detected in ['water leakage', 'water_supply']:
        return {'category': 'civic_issue', 'subcategory': 'water_supply'}
    elif clean_detected in ['broken streetlight', 'streetlight']:
        return {'category': 'civic_issue', 'subcategory': 'street_light'}
    elif clean_detected in ['drainage', 'drainage_sewage', 'open manhole', 'flooding']:
        return {'category': 'civic_issue', 'subcategory': 'sewage'}
    elif clean_detected in ['fallen tree', 'tree_environment']:
        return {'category': 'civic_issue', 'subcategory': 'other_civic'}
    elif clean_detected in ['active fire', 'fire', 'smoke']:
        return {'category': 'fire', 'subcategory': 'fire_outbreak'}
    elif clean_detected in ['fire hazard', 'blocked exit']:
        return {'category': 'fire', 'subcategory': 'safety_hazard'}
    elif clean_detected == 'gas leak':
        return {'category': 'fire', 'subcategory': 'gas_leak'}
    elif clean_detected in ['ambulance block', 'ambulance']:
        return {'category': 'hospital', 'subcategory': 'ambulance_delay'}
    elif clean_detected in ['hospital infrastructure', 'medical waste']:
        return {'category': 'hospital', 'subcategory': 'hospital_infra'}
    elif clean_detected == 'corruption_bribery':
        return {'category': 'corruption', 'subcategory': 'bribery'}
    elif clean_detected in ['not_a_complaint', 'uncertain']:
        return {'category': clean_detected, 'subcategory': clean_detected}
    else:
        return {'category': 'civic_issue', 'subcategory': 'other_civic'}


def detect_issue_from_image(file_bytes, mime_type='image/jpeg', original_name=''):
    import base64
    import requests
    
    gemini_key = os.getenv('GEMINI_API_KEY')

    base64_image = base64.b64encode(file_bytes).decode('utf-8')
    print(f"[VisionService] Converting image of type {mime_type} to Base64 ({len(base64_image)} chars)")

    prompt_text = (
        "Analyze this image to determine if it is suitable for filing a public/civic complaint.\n\n"
        "IMPORTANT RULES:\n"
        "1. A passport-size/person portrait, selfie, food, product photo, normal building, scenery, or random screenshot without civic issue evidence is NOT a complaint. Set isComplaint to false.\n"
        "2. If the image clearly shows corruption or bribery, classify it under category \"corruption\".\n"
        "3. If the image is extremely blurry, ambiguous, or unclear, set isComplaint to false.\n"
        "4. If it IS a valid complaint, set isComplaint to true, and assign the most appropriate category and subcategory.\n"
        "5. Department mapping: road_damage->Municipal Corporation, garbage->Sanitation Department, water_supply->Water Supply Department, sewage->Sewerage / Municipal Department, streetlight->Electrical / Municipal Department, corruption->Anti-Corruption / Vigilance Department, fire->Fire & Emergency Services, hospital->Health Department.\n\n"
        "You MUST return ONLY a strictly valid JSON object with EXACTLY this structure:\n"
        "{\n"
        "  \"isComplaint\": true/false,\n"
        "  \"category\": \"civic_issue, crime, corruption, fire, hospital, or not_a_complaint\",\n"
        "  \"subcategory\": \"road_damage, garbage, water_supply, sewage, street_light, other_civic, other, etc.\",\n"
        "  \"detectedIssue\": \"Short name of the issue detected, e.g., Pothole, Garbage, None\",\n"
        "  \"summary\": \"1-3 sentences describing the issue visible in the image.\",\n"
        "  \"severity\": \"low, medium, high, or emergency\",\n"
        "  \"confidence\": a numeric value between 0.0 and 1.0,\n"
        "  \"department\": \"Recommended department name\",\n"
        "  \"reason\": \"A brief explanation of what the image shows and why it was classified this way.\"\n"
        "}\n\nPlease return strictly JSON. Do not include markdown formatting like ```json."
    )

    def parse_and_format_response(reply_text, engine):
        try:
            # Clean markdown if Gemini still returns it
            if reply_text.startswith('```json'):
                reply_text = reply_text[7:]
                if reply_text.endswith('```'):
                    reply_text = reply_text[:-3]
            elif reply_text.startswith('```'):
                reply_text = reply_text[3:]
                if reply_text.endswith('```'):
                    reply_text = reply_text[:-3]
                    
            parsed = json.loads(reply_text.strip())
            
            is_complaint = parsed.get('isComplaint', False)
            if not isinstance(is_complaint, bool):
                is_complaint = False
                
            confidence = parsed.get('confidence', 0)
            if not isinstance(confidence, (int, float)):
                confidence = 0
                
            if not is_complaint:
                category_val = parsed.get('category', 'not_a_complaint')
                if category_val != 'uncertain':
                    category_val = 'not_a_complaint'
                return {
                    'success': True,
                    'is_complaint': False,
                    'category': category_val,
                    'detectedCategory': parsed.get('detectedIssue', 'None'),
                    'confidence': confidence,
                    'severity': parsed.get('severity', 'low'),
                    'analysis': parsed.get('summary', ''),
                    'reason': parsed.get('reason', 'The image does not show a reportable public grievance.'),
                    'mappedCategory': category_val,
                    'mappedSubcategory': parsed.get('subcategory', 'other'),
                    'department': parsed.get('department', ''),
                    'engine': engine
                }

            return {
                'success': True,
                'is_complaint': True,
                'category': parsed.get('detectedIssue', 'civic_issue'),
                'detectedCategory': parsed.get('detectedIssue', 'civic_issue'),
                'confidence': confidence,
                'severity': parsed.get('severity', 'medium'),
                'analysis': parsed.get('summary', 'Issue detected.'),
                'reason': parsed.get('reason', 'Issue detected.'),
                'mappedCategory': parsed.get('category', 'civic_issue'),
                'mappedSubcategory': parsed.get('subcategory', 'other_civic'),
                'department': parsed.get('department', 'Municipal Corporation'),
                'engine': engine
            }
        except Exception as e:
            print(f"⚠️ [VisionService] JSON parse error from {engine}: {str(e)}")
            return {
                'success': True,
                'is_complaint': False,
                'category': 'uncertain',
                'confidence': 0,
                'severity': 'unknown',
                'analysis': 'Failed to process image structure.',
                'reason': 'Please upload a clearer image.',
                'engine': engine
            }

    # ================= TIER 1: GEMINI VISION =================
    if gemini_key:
        try:
            print("🤖 [VisionService] [TIER 1] Requesting Gemini 3.6 Flash via REST API...")
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt_text},
                            {
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": base64_image
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "responseMimeType": "application/json"
                }
            }
            
            headers = {
                'Content-Type': 'application/json'
            }
            
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={gemini_key}"
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=60
            )
            
            
            if response.status_code == 200:
                res_json = response.json()
                reply_text = res_json['candidates'][0]['content']['parts'][0]['text'].strip()
                print(f"[VisionService] [TIER 1] Gemini response: {reply_text}")
                
                with open("gemini_debug.log", "a", encoding="utf-8") as f:
                    f.write(f"SUCCESS: {reply_text}\n")
                    
                return parse_and_format_response(reply_text, 'gemini-3.6-flash')
            else:
                error_msg = f"[VisionService] [TIER 1] Gemini failed with status {response.status_code}: {response.text}"
                print(error_msg)
                with open("gemini_debug.log", "a", encoding="utf-8") as f:
                    f.write(f"ERROR: {error_msg}\n")
                
        except Exception as e:
            error_msg = f"[VisionService] [TIER 1] Gemini request threw error: {str(e)}"
            print(error_msg)
            with open("gemini_debug.log", "a", encoding="utf-8") as f:
                f.write(f"EXCEPTION: {error_msg}\n")
 
    print("[VisionService] GEMINI_API_KEY is not configured in .env or failed.")
    return {
        'success': False,
        'message': 'AI Vision provider failed or is not configured.'
    }

def analyze_complaint_comprehensive(file_bytes, mime_type, description):
    """
    ANALYSIS 2: Final authoritative AI analysis that incorporates BOTH image and citizen description.
    """
    import base64
    import requests
    
    gemini_key = os.getenv('GEMINI_API_KEY')
    if not gemini_key:
        raise Exception("GEMINI_API_KEY not found")

    base64_image = base64.b64encode(file_bytes).decode('utf-8')
    
    prompt_text = (
        "Analyze this public grievance complaint using BOTH the provided visual evidence (image) AND the contextual evidence (citizen description).\n"
        f"Citizen Description: \"{description}\"\n\n"
        "IMPORTANT RULES:\n"
        "1. The image is visual evidence. The citizen description is contextual evidence. Use both.\n"
        "2. The final summary and severity should consider the citizen's description. But do not blindly trust exaggerated claims not supported by the image.\n"
        "3. Return strict JSON. Do not fabricate information.\n"
        "4. Severity values must be: low, medium, high, or emergency.\n\n"
        "You MUST return ONLY a strictly valid JSON object with EXACTLY this structure:\n"
        "{\n"
        "  \"isComplaint\": true/false,\n"
        "  \"category\": \"civic_issue, crime, corruption, fire, or hospital\",\n"
        "  \"subcategory\": \"road_damage, garbage, water_supply, sewage, street_light, other_civic, etc.\",\n"
        "  \"detectedIssue\": \"Short name of the issue detected\",\n"
        "  \"summary\": \"A concise 1-3 sentence summary incorporating both the visual evidence and the citizen's description.\",\n"
        "  \"severity\": \"low, medium, high, or emergency\",\n"
        "  \"confidence\": numeric value between 0.0 and 1.0,\n"
        "  \"department\": \"Recommended department name\",\n"
        "  \"reason\": \"Why you determined this severity and summary based on both sources.\"\n"
        "}\n\nPlease return strictly JSON. No markdown."
    )
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt_text},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64_image
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
        }
    }
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={gemini_key}"
    response = requests.post(url, json=payload, headers={'Content-Type': 'application/json'}, timeout=60)
    
    if response.status_code == 200:
        res_json = response.json()
        reply_text = res_json['candidates'][0]['content']['parts'][0]['text'].strip()
        
        # Clean markdown if Gemini still returns it
        if reply_text.startswith('```json'):
            reply_text = reply_text[7:]
            if reply_text.endswith('```'):
                reply_text = reply_text[:-3]
        elif reply_text.startswith('```'):
            reply_text = reply_text[3:]
            if reply_text.endswith('```'):
                reply_text = reply_text[:-3]
                
        return json.loads(reply_text.strip())
    else:
        raise Exception(f"Gemini failed with status {response.status_code}")
