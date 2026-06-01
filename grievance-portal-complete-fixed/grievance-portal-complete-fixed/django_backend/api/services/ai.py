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
