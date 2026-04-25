from cryptography.fernet import Fernet
from config import settings

# Initialize Fernet instance if key is provided
fernet = None
if hasattr(settings, 'encryption_key') and settings.encryption_key:
    try:
        fernet = Fernet(settings.encryption_key.encode())
    except ValueError:
        print("Invalid ENCRYPTION_KEY format. Encryption disabled.")

def encrypt_text(text: str) -> str:
    """Encrypts a string if encryption is configured, otherwise returns the original."""
    if not fernet or not text:
        return text
    try:
        return fernet.encrypt(text.encode()).decode()
    except Exception as e:
        print(f"Encryption failed: {e}")
        return text

def decrypt_text(encrypted_text: str) -> str:
    """Decrypts a string if encryption is configured, otherwise returns the original."""
    if not fernet or not encrypted_text:
        return encrypted_text
    try:
        return fernet.decrypt(encrypted_text.encode()).decode()
    except Exception:
        # If decryption fails (e.g., old unencrypted message or bad key), return original
        return encrypted_text

def encrypt_data(data: bytes) -> bytes:
    """Encrypts raw bytes if encryption is configured."""
    if not fernet or not data:
        return data
    try:
        return fernet.encrypt(data)
    except Exception as e:
        print(f"Data encryption failed: {e}")
        return data

def decrypt_data(data: bytes) -> bytes:
    """Decrypts raw bytes if encryption is configured."""
    if not fernet or not data:
        return data
    try:
        return fernet.decrypt(data)
    except Exception:
        return data

