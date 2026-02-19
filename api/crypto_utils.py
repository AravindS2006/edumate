import base64
import hashlib
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

KEY_BASE64 = "9vcPlytFC4ck0X0gvm+Y6+m0vgCAnq0xDFd3X6pBijtozwmOjntoUCwzpSxLZ0GP2PtDkkJERESxdG1bdt8w=="

def get_cipher():
    global _CIPHER_CACHE
    if _CIPHER_CACHE is None:
        key = hashlib.sha256(KEY_BASE64.encode('utf-8')).digest()
        _CIPHER_CACHE = AES.new(key, AES.MODE_ECB)
    return _CIPHER_CACHE

_CIPHER_CACHE = None

def encrypt_data(data: str) -> str:
    cipher = get_cipher()
    padded_data = pad(data.encode('utf-8'), AES.block_size)
    encrypted_bytes = cipher.encrypt(padded_data)
    return base64.b64encode(encrypted_bytes).decode('utf-8')

def decrypt_data(encrypted_data: str) -> str:
    cipher = get_cipher()
    encrypted_bytes = base64.b64decode(encrypted_data)
    decrypted_padded = cipher.decrypt(encrypted_bytes)
    decrypted_data = unpad(decrypted_padded, AES.block_size)
    return decrypted_data.decode('utf-8')
