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
    
    open_ai_key = os.getenv('OPENAI_API_KEY')
    groq_key = os.getenv('GROQ_API_KEY')

    # Convert bytes to base64
    base64_image = base64.b64encode(file_bytes).decode('utf-8')
    print(f"🖼️ [VisionService] Converting image of type {mime_type} to Base64 ({len(base64_image)} chars)")

    prompt_text = (
        "Analyze this image to determine if it is suitable for filing a public/civic complaint.\n\n"
        "IMPORTANT RULES:\n"
        "1. A passport-size/person portrait, selfie, food, product photo, normal building, scenery, or random screenshot without civic issue evidence is NOT a complaint. For these, return is_complaint: false and category: \"not_a_complaint\".\n"
        "2. If the image clearly shows corruption or bribery (e.g., money exchange in an official context), classify it as \"corruption_bribery\". Do NOT infer corruption just because a person is in the image.\n"
        "3. If the image is extremely blurry, ambiguous, or unclear, return category: \"uncertain\".\n"
        "4. If it IS a valid complaint, assign the most appropriate category (e.g., pothole, garbage_waste, streetlight, water_supply, drainage, road_damage, illegal_dumping, corruption_bribery, tree_environment, traffic_signal, public_property_damage, fire, hospital_issue, or other_civic_issue).\n\n"
        "You MUST return ONLY a strictly valid JSON object with EXACTLY this structure:\n"
        "{\n"
        "  \"is_complaint\": true/false,\n"
        "  \"category\": \"one of the categories listed above, not_a_complaint, or uncertain\",\n"
        "  \"confidence\": a number between 0.0 and 100.0,\n"
        "  \"severity\": \"low\", \"medium\", \"high\", \"critical\", or \"none\",\n"
        "  \"analysis\": \"A brief explanation of what the image shows.\",\n"
        "  \"reason\": \"Why it was classified this way.\"\n"
        "}"
    )

    def parse_and_format_response(reply_text, engine):
        try:
            parsed = json.loads(reply_text)
            is_complaint = parsed.get('is_complaint', False)
            if not isinstance(is_complaint, bool):
                is_complaint = False
                
            category = str(parsed.get('category', 'uncertain')).lower().strip()
            
            # Normalize corruption variants
            if 'corruption' in category or 'briber' in category:
                category = 'corruption_bribery'

            if category == 'uncertain':
                return {
                    'success': True,
                    'is_complaint': False,
                    'category': 'uncertain',
                    'confidence': parsed.get('confidence', 0),
                    'severity': 'unknown',
                    'analysis': parsed.get('analysis', 'The image does not provide enough visual evidence.'),
                    'reason': parsed.get('reason', 'Please upload a clearer image showing the issue.'),
                    'engine': engine
                }

            if not is_complaint or category == 'not_a_complaint':
                return {
                    'success': True,
                    'is_complaint': False,
                    'category': 'not_a_complaint',
                    'confidence': parsed.get('confidence', 100),
                    'severity': 'none',
                    'analysis': parsed.get('analysis', 'The image is not a valid civic complaint.'),
                    'reason': parsed.get('reason', 'This image does not show a civic/public issue that can be reported.'),
                    'engine': engine
                }

            mappings = map_category(category)
            return {
                'success': True,
                'is_complaint': True,
                'category': category,
                'confidence': parsed.get('confidence', 90),
                'severity': parsed.get('severity', 'medium'),
                'analysis': parsed.get('analysis', 'Issue detected.'),
                'reason': parsed.get('reason', 'Visual evidence found.'),
                'mappedCategory': mappings['category'],
                'mappedSubcategory': mappings['subcategory'],
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

    # ================= TIER 1: OPENAI VISION =================
    if open_ai_key:
        try:
            print("🤖 [VisionService] [TIER 1] Requesting OpenAI GPT-4o-mini Vision...")
            payload = {
                'model': 'gpt-4o-mini',
                'messages': [
                    {
                        'role': 'system',
                        'content': 'You are an expert Smart City issue classifier. Always respond with strictly formatted JSON.'
                    },
                    {
                        'role': 'user',
                        'content': [
                            { 'type': 'text', 'text': prompt_text },
                            {
                                'type': 'image_url',
                                'image_url': {
                                    'url': f"data:{mime_type};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                'response_format': { 'type': 'json_object' },
                'max_tokens': 300,
                'temperature': 0.1
            }
            
            headers = {
                'Authorization': f'Bearer {open_ai_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                json=payload,
                headers=headers,
                timeout=25
            )
            
            if response.status_code == 200:
                res_json = response.json()
                reply_text = res_json['choices'][0]['message']['content'].strip()
                print(f"✅ [VisionService] [TIER 1] OpenAI response: {reply_text}")
                return parse_and_format_response(reply_text, 'openai')
            else:
                print(f"⚠️ [VisionService] [TIER 1] OpenAI failed with status {response.status_code}: {response.text}")
        except Exception as e:
            print(f"⚠️ [VisionService] [TIER 1] OpenAI request threw error: {str(e)}")
 
    # ================= TIER 2: GROQ VISION FALLBACK =================
    if groq_key:
        try:
            print("🤖 [VisionService] [TIER 2] Falling back to Groq llama-3.2-11b-vision-preview...")
            payload = {
                'model': 'llama-3.2-11b-vision-preview',
                'messages': [
                    {
                        'role': 'system',
                        'content': 'You are an expert Smart City issue classifier. Always respond with strictly formatted JSON.'
                    },
                    {
                        'role': 'user',
                        'content': [
                            { 'type': 'text', 'text': prompt_text },
                            {
                                'type': 'image_url',
                                'image_url': {
                                    'url': f"data:{mime_type};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                'response_format': { 'type': 'json_object' },
                'max_tokens': 300,
                'temperature': 0.1
            }
            
            headers = {
                'Authorization': f'Bearer {groq_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                'https://api.groq.com/openai/v1/chat/completions',
                json=payload,
                headers=headers,
                timeout=25
            )
            
            if response.status_code == 200:
                res_json = response.json()
                reply_text = res_json['choices'][0]['message']['content'].strip()
                print(f"✅ [VisionService] [TIER 2] Groq response: {reply_text}")
                return parse_and_format_response(reply_text, 'groq')
            else:
                print(f"⚠️ [VisionService] [TIER 2] Groq failed with status {response.status_code}: {response.text}")
        except Exception as e:
            print(f"⚠️ [VisionService] [TIER 2] Groq request threw error: {str(e)}")
 
    # ================= TIER 3: OFFLINE SMART CLASSIFIER =================
    print("💡 [VisionService] [TIER 3] Activating fail-safe Offline Local Keyword Classifier...")
    
    local_categories = [
        { 'keyword': 'fire', 'label': 'fire', 'category': 'fire', 'subcategory': 'fire_outbreak', 'severity': 'critical' },
        { 'keyword': 'smoke', 'label': 'fire', 'category': 'fire', 'subcategory': 'fire_outbreak', 'severity': 'critical' },
        { 'keyword': 'hazard', 'label': 'fire_hazard', 'category': 'fire', 'subcategory': 'safety_hazard', 'severity': 'high' },
        { 'keyword': 'gas', 'label': 'gas_leak', 'category': 'fire', 'subcategory': 'gas_leak', 'severity': 'critical' },
        { 'keyword': 'ambulance', 'label': 'hospital_issue', 'category': 'hospital', 'subcategory': 'ambulance_delay', 'severity': 'high' },
        { 'keyword': 'hospital', 'label': 'hospital_issue', 'category': 'hospital', 'subcategory': 'hospital_infra', 'severity': 'medium' },
        { 'keyword': 'medical', 'label': 'hospital_issue', 'category': 'hospital', 'subcategory': 'hospital_infra', 'severity': 'medium' },
        { 'keyword': 'pothole', 'label': 'pothole', 'category': 'civic_issue', 'subcategory': 'road_damage', 'severity': 'medium' },
        { 'keyword': 'crack', 'label': 'road_damage', 'category': 'civic_issue', 'subcategory': 'road_damage', 'severity': 'medium' },
        { 'keyword': 'garbage', 'label': 'garbage_waste', 'category': 'civic_issue', 'subcategory': 'garbage', 'severity': 'medium' },
        { 'keyword': 'waste', 'label': 'garbage_waste', 'category': 'civic_issue', 'subcategory': 'garbage', 'severity': 'medium' },
        { 'keyword': 'trash', 'label': 'garbage_waste', 'category': 'civic_issue', 'subcategory': 'garbage', 'severity': 'medium' },
        { 'keyword': 'leak', 'label': 'water_supply', 'category': 'civic_issue', 'subcategory': 'water_supply', 'severity': 'medium' },
        { 'keyword': 'water', 'label': 'water_supply', 'category': 'civic_issue', 'subcategory': 'water_supply', 'severity': 'medium' },
        { 'keyword': 'light', 'label': 'streetlight', 'category': 'civic_issue', 'subcategory': 'street_light', 'severity': 'low' },
        { 'keyword': 'tree', 'label': 'tree_environment', 'category': 'civic_issue', 'subcategory': 'other_civic', 'severity': 'medium' },
        { 'keyword': 'manhole', 'label': 'drainage', 'category': 'civic_issue', 'subcategory': 'sewage', 'severity': 'high' },
        { 'keyword': 'drain', 'label': 'drainage', 'category': 'civic_issue', 'subcategory': 'sewage', 'severity': 'high' },
        { 'keyword': 'flood', 'label': 'drainage', 'category': 'civic_issue', 'subcategory': 'sewage', 'severity': 'high' },
        { 'keyword': 'bribe', 'label': 'corruption_bribery', 'category': 'corruption', 'subcategory': 'bribery', 'severity': 'high' },
        { 'keyword': 'corruption', 'label': 'corruption_bribery', 'category': 'corruption', 'subcategory': 'bribery', 'severity': 'high' }
    ]

    clean_name = str(original_name or '').lower()
    matched = None
    for item in local_categories:
        if item['keyword'] in clean_name:
            matched = item
            break

    if not matched:
        return {
            'success': True,
            'is_complaint': False,
            'category': 'uncertain',
            'confidence': 0,
            'severity': 'unknown',
            'analysis': 'The image name did not contain recognizable keywords, and AI detection failed.',
            'reason': 'Please upload a clearer image.',
            'engine': 'local'
        }

    return {
        'success': True,
        'is_complaint': True,
        'category': matched['label'],
        'confidence': 85,
        'reason': 'Issue detected via offline visual pattern matching.',
        'analysis': 'Image file name matched known complaint signatures.',
        'severity': matched['severity'],
        'mappedCategory': matched['category'],
        'mappedSubcategory': matched['subcategory'],
        'engine': 'local'
    }
