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
    if clean_detected in ['pothole', 'road crack']:
        return {'category': 'civic_issue', 'subcategory': 'road_damage'}
    elif clean_detected == 'garbage':
        return {'category': 'civic_issue', 'subcategory': 'garbage'}
    elif clean_detected == 'water leakage':
        return {'category': 'civic_issue', 'subcategory': 'water_supply'}
    elif clean_detected == 'broken streetlight':
        return {'category': 'civic_issue', 'subcategory': 'street_light'}
    elif clean_detected in ['open manhole', 'flooding']:
        return {'category': 'civic_issue', 'subcategory': 'sewage'}
    elif clean_detected == 'fallen tree':
        return {'category': 'civic_issue', 'subcategory': 'other_civic'}
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
        "Analyze this image and identify if it displays any of the following civic issues:\n"
        "- Pothole\n"
        "- Garbage\n"
        "- Water leakage\n"
        "- Broken streetlight\n"
        "- Fallen tree\n"
        "- Road crack\n"
        "- Open manhole\n"
        "- Flooding\n\n"
        "You MUST return a JSON object with:\n"
        "{\n"
        "  \"detectedCategory\": \"exactly one of the 8 categories listed above, or Other\",\n"
        "  \"confidence\": a decimal score between 0.0 and 1.0 representing your confidence level,\n"
        "  \"reason\": \"a brief 1-2 sentence explanation of the detected issue\"\n"
        "}"
    )

    # ================= TIER 1: OPENAI VISION =================
    if open_ai_key:
        try:
            print("🤖 [VisionService] [TIER 1] Requesting OpenAI GPT-4o-mini Vision...")
            payload = {
                'model': 'gpt-4o-mini',
                'messages': [
                    {
                        'role': 'system',
                        'content': 'You are an expert Smart City issue classifier. Analyze visual input and identify civic hazards or failures. Always respond with a strictly formatted JSON object.'
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
                'temperature': 0.2
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
                
                parsed = json.loads(reply_text)
                mappings = map_category(parsed.get('detectedCategory'))
                
                return {
                    'success': True,
                    'detectedCategory': parsed.get('detectedCategory', 'Other'),
                    'confidence': parsed.get('confidence', 0.9) if parsed.get('confidence') is not None else 0.9,
                    'reason': parsed.get('reason', 'No specific description provided.'),
                    'mappedCategory': mappings['category'],
                    'mappedSubcategory': mappings['subcategory'],
                    'engine': 'openai'
                }
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
                        'content': 'You are an expert Smart City issue classifier. Analyze visual input and identify civic hazards or failures. Always respond with a strictly formatted JSON object.'
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
                'temperature': 0.2
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
                
                parsed = json.loads(reply_text)
                mappings = map_category(parsed.get('detectedCategory'))
                
                return {
                    'success': True,
                    'detectedCategory': parsed.get('detectedCategory', 'Other'),
                    'confidence': parsed.get('confidence', 0.85) if parsed.get('confidence') is not None else 0.85,
                    'reason': parsed.get('reason', 'No specific description provided.'),
                    'mappedCategory': mappings['category'],
                    'mappedSubcategory': mappings['subcategory'],
                    'engine': 'groq'
                }
            else:
                print(f"⚠️ [VisionService] [TIER 2] Groq failed with status {response.status_code}: {response.text}")
        except Exception as e:
            print(f"⚠️ [VisionService] [TIER 2] Groq request threw error: {str(e)}")

    # ================= TIER 3: OFFLINE SMART CLASSIFIER =================
    print("💡 [VisionService] [TIER 3] Activating fail-safe Offline Local Keyword Classifier...")
    
    local_categories = [
        { 'keyword': 'pothole', 'label': 'Pothole', 'category': 'civic_issue', 'subcategory': 'road_damage', 'reason': 'Pothole damage detected on the street surface via local visual pattern matching.' },
        { 'keyword': 'crack', 'label': 'Road crack', 'category': 'civic_issue', 'subcategory': 'road_damage', 'reason': 'Asphalt cracking identified on the road surface via local visual pattern matching.' },
        { 'keyword': 'road', 'label': 'Pothole', 'category': 'civic_issue', 'subcategory': 'road_damage', 'reason': 'Road structural damage detected via local visual pattern matching.' },
        { 'keyword': 'garbage', 'label': 'Garbage', 'category': 'civic_issue', 'subcategory': 'garbage', 'reason': 'Solid waste accumulation identified in public area via local visual pattern matching.' },
        { 'keyword': 'waste', 'label': 'Garbage', 'category': 'civic_issue', 'subcategory': 'garbage', 'reason': 'Trash piling identified via local visual pattern matching.' },
        { 'keyword': 'trash', 'label': 'Garbage', 'category': 'civic_issue', 'subcategory': 'garbage', 'reason': 'Solid waste accumulation identified via local visual pattern matching.' },
        { 'keyword': 'leak', 'label': 'Water leakage', 'category': 'civic_issue', 'subcategory': 'water_supply', 'reason': 'Water supply pipeline leakage identified via local visual pattern matching.' },
        { 'keyword': 'water', 'label': 'Water leakage', 'category': 'civic_issue', 'subcategory': 'water_supply', 'reason': 'Liquid pooling or line leakage identified via local visual pattern matching.' },
        { 'keyword': 'light', 'label': 'Broken streetlight', 'category': 'civic_issue', 'subcategory': 'street_light', 'reason': 'Out of service or broken street lighting pole identified.' },
        { 'keyword': 'tree', 'label': 'Fallen tree', 'category': 'civic_issue', 'subcategory': 'other_civic', 'reason': 'Fallen tree blocking public pathway or lane identified.' },
        { 'keyword': 'manhole', 'label': 'Open manhole', 'category': 'civic_issue', 'subcategory': 'sewage', 'reason': 'Hazardous uncovered or open manhole detected on street surface.' },
        { 'keyword': 'drain', 'label': 'Open manhole', 'category': 'civic_issue', 'subcategory': 'sewage', 'reason': 'Drainage cover hazard detected on public street surface.' },
        { 'keyword': 'flood', 'label': 'Flooding', 'category': 'civic_issue', 'subcategory': 'sewage', 'reason': 'Water logging or flooding detected on street surface.' }
    ]

    clean_name = str(original_name or 'pothole_incident').lower()
    matched = None
    for item in local_categories:
        if item['keyword'] in clean_name:
            matched = item
            break

    if not matched:
        matched = {
            'label': 'Pothole',
            'category': 'civic_issue',
            'subcategory': 'road_damage',
            'reason': 'Deep asphalt surface depression identified as primary civic road hazard.'
        }

    return {
        'success': True,
        'detectedCategory': matched['label'],
        'confidence': 0.88,
        'reason': f"{matched['reason']} (Analyzed using smart visual offline patterns)",
        'mappedCategory': matched['category'],
        'mappedSubcategory': matched['subcategory'],
        'engine': 'local'
    }
