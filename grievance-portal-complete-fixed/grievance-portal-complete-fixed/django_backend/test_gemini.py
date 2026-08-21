import os
import sys
import json
import base64
import requests
from dotenv import load_dotenv

load_dotenv()
gemini_key = os.getenv('GEMINI_API_KEY')

# Create a dummy image
file_bytes = b"dummy image content"
base64_image = base64.b64encode(file_bytes).decode('utf-8')
mime_type = 'image/jpeg'

prompt_text = (
    "Analyze this image to determine if it is suitable for filing a public/civic complaint.\n\n"
    "IMPORTANT RULES:\n"
    "1. A passport-size/person portrait, selfie, food, product photo, normal building, scenery, or random screenshot without civic issue evidence is NOT a complaint. Set isRelevant to false.\n"
    "2. If the image clearly shows corruption or bribery, classify it under category \"corruption\".\n"
    "3. If the image is extremely blurry, ambiguous, or unclear, set isRelevant to false.\n"
    "4. If it IS a valid complaint, set isRelevant to true, and assign the most appropriate category and subcategory.\n\n"
    "You MUST return ONLY a strictly valid JSON object with EXACTLY this structure:\n"
    "{\n"
    "  \"detectedIssue\": \"Short name of the issue detected, e.g., Pothole, Garbage\",\n"
    "  \"category\": \"civic_issue, crime, corruption, fire, or hospital\",\n"
    "  \"subcategory\": \"road_damage, garbage, water_supply, sewage, street_light, other_civic, etc.\",\n"
    "  \"confidence\": a number between 0.0 and 1.0,\n"
    "  \"severity\": \"low\", \"medium\", \"high\", \"critical\", or \"none\",\n"
    "  \"isRelevant\": true/false,\n"
    "  \"analysis\": \"A brief explanation of what the image shows.\"\n"
    "}\n\nPlease return strictly JSON. Do not include markdown formatting like ```json."
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

headers = {
    'Content-Type': 'application/json'
}

print("Calling Gemini API...")
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={gemini_key}"
response = requests.post(url, json=payload, headers=headers, timeout=25)

print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    res_json = response.json()
    reply_text = res_json['candidates'][0]['content']['parts'][0]['text'].strip()
    print("Gemini raw text:")
    print(repr(reply_text))
    try:
        if reply_text.startswith('```json'):
            reply_text = reply_text[7:]
            if reply_text.endswith('```'):
                reply_text = reply_text[:-3]
        elif reply_text.startswith('```'):
            reply_text = reply_text[3:]
            if reply_text.endswith('```'):
                reply_text = reply_text[:-3]
        parsed = json.loads(reply_text.strip())
        print("Parsed JSON successfully:")
        print(json.dumps(parsed, indent=2))
    except Exception as e:
        print(f"JSON Parse Error: {str(e)}")
else:
    print(response.text)
