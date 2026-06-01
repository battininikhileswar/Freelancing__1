import os
import uuid
import math
import random
import hashlib
import hmac
from datetime import datetime
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

# Category prefix map
CATEGORY_PREFIX = {
    'crime': 'PS',
    'corruption': 'ACB',
    'civic_issue': 'MUN',
}

# State code map (Indian states)
STATE_CODES = {
    'andhra pradesh': 'AP',
    'arunachal pradesh': 'AR',
    'assam': 'AS',
    'bihar': 'BR',
    'chhattisgarh': 'CG',
    'goa': 'GA',
    'gujarat': 'GJ',
    'haryana': 'HR',
    'himachal pradesh': 'HP',
    'jharkhand': 'JH',
    'karnataka': 'KA',
    'kerala': 'KL',
    'madhya pradesh': 'MP',
    'maharashtra:': 'MH',
    'maharashtra': 'MH',
    'manipur': 'MN',
    'meghalaya': 'ML',
    'mizoram': 'MZ',
    'nagaland': 'NL',
    'odisha': 'OD',
    'punjab': 'PB',
    'rajasthan': 'RJ',
    'sikkim': 'SK',
    'tamil nadu': 'TN',
    'telangana': 'TG',
    'tripura': 'TR',
    'uttar pradesh': 'UP',
    'uttarakhand': 'UK',
    'west bengal': 'WB',
    'delhi': 'DL',
}

def generate_complaint_id(category, state):
    prefix = CATEGORY_PREFIX.get(category, 'GEN')
    state_code = STATE_CODES.get(state.lower() if state else '', 'XX')
    date_str = datetime.now().strftime('%Y%m%d')
    random_part = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{state_code}-{date_str}-{random_part}"

def generate_otp():
    return str(random.randint(100000, 999999))

def generate_secure_token():
    return uuid.uuid4().hex + hex(int(datetime.now().timestamp()))[2:]

# ======= AES-256-GCM Encryption =======
KEY_LENGTH = 32
IV_LENGTH = 12  # Standard IV length for AES-GCM is 12 bytes (96 bits) in node
TAG_LENGTH = 16

def get_key():
    raw_key = os.getenv('ENCRYPTION_KEY', 'default_dev_key_not_for_production_!!')
    # Match node.js scryptSync(rawKey, 'grievance_portal_salt', 32)
    kdf = Scrypt(
        salt=b'grievance_portal_salt',
        length=KEY_LENGTH,
        n=16384, # default scrypt parameters in node.js
        r=8,
        p=1,
        backend=default_backend()
    )
    return kdf.derive(raw_key.encode('utf-8'))

def encrypt(text):
    if not text:
        return text
    try:
        key = get_key()
        iv = os.urandom(IV_LENGTH)
        encryptor = Cipher(
            algorithms.AES(key),
            modes.GCM(iv),
            backend=default_backend()
        ).encryptor()
        
        ciphertext = encryptor.update(str(text).encode('utf-8')) + encryptor.finalize()
        auth_tag = encryptor.tag
        
        return f"{iv.hex()}:{auth_tag.hex()}:{ciphertext.hex()}"
    except Exception as e:
        print(f"Encryption error: {str(e)}")
        return text

def decrypt(encrypted_text):
    if not encrypted_text or ':' not in encrypted_text:
        return encrypted_text
    try:
        parts = encrypted_text.split(':')
        if len(parts) != 3:
            return encrypted_text
        
        iv_hex, auth_tag_hex, ciphertext_hex = parts
        key = get_key()
        iv = bytes.fromhex(iv_hex)
        auth_tag = bytes.fromhex(auth_tag_hex)
        ciphertext = bytes.fromhex(ciphertext_hex)
        
        decryptor = Cipher(
            algorithms.AES(key),
            modes.GCM(iv, auth_tag),
            backend=default_backend()
        ).decryptor()
        
        decrypted = decryptor.update(ciphertext) + decryptor.finalize()
        return decrypted.decode('utf-8')
    except Exception as e:
        print(f"Decryption error: {str(e)}")
        return encrypted_text

def hash_phone(phone):
    if not phone:
        return None
    key = os.getenv('ENCRYPTION_KEY', 'dev_salt').encode('utf-8')
    return hmac.new(key, str(phone).encode('utf-8'), hashlib.sha256).hexdigest()

def mask_phone(phone):
    if not phone:
        return ''
    s = str(phone)
    return s[:2] + '****' + s[-4:]

def mask_email(email):
    if not email or '@' not in email:
        return ''
    user, domain = email.split('@')
    return user[:2] + '**@' + domain
