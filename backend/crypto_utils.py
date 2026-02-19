import base64
import hashlib
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

# The key provided in the prompt
KEY_BASE64 = "9vcPlytFC4ck0X0gvm+Y6+m0vgCAnq0xDFd3X6pBijtozwmOjntoUCwzpSxLZ0GP2PtDkkJERESxdG1bdt8w=="

def get_cipher():
    # Logic: SHA-256 hash of KEY_BASE64 -> AES-ECB Mode
    key_bytes = base64.b64decode(KEY_BASE64)
    # The prompt says "SHA-256 hash of KEY_BASE64". 
    # Usually, this means hashing the *bytes* of the key.
    # But let's follow the instruction "SHA-256 hash of KEY_BASE64" strictly.
    # If it acts up, we might need to hash the string or the raw bytes.
    # Given typical scenarios, it's likely:
    # key = hashlib.sha256(KEY_BASE64.encode('utf-8')).digest()
    # OR 
    # key = hashlib.sha256(base64.b64decode(KEY_BASE64)).digest()
    
    # "LOGIC: SHA-256 hash of KEY_BASE64 -> AES-ECB Mode -> Pkcs7 Padding."
    # I will assume it means hashing the original base64 string directly as bytes.
    
    global _CIPHER_CACHE
    if _CIPHER_CACHE is None:
        key = hashlib.sha256(KEY_BASE64.encode('utf-8')).digest()
        _CIPHER_CACHE = AES.new(key, AES.MODE_ECB)
    return _CIPHER_CACHE

_CIPHER_CACHE = None

def encrypt_data(data: str) -> str:
    cipher = get_cipher()
    # Pkcs7 Padding
    padded_data = pad(data.encode('utf-8'), AES.block_size)
    encrypted_bytes = cipher.encrypt(padded_data)
    return base64.b64encode(encrypted_bytes).decode('utf-8')

def decrypt_data(encrypted_data: str) -> str:
    cipher = get_cipher()
    encrypted_bytes = base64.b64decode(encrypted_data)
    decrypted_padded = cipher.decrypt(encrypted_bytes)
    decrypted_data = unpad(decrypted_padded, AES.block_size)
    return decrypted_data.decode('utf-8')
