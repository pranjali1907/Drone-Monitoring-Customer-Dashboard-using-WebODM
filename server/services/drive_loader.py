import requests
import os
import re

def download_file_from_google_drive(id: str, destination: str):
    URL = "https://docs.google.com/uc?export=download"

    session = requests.Session()
    response = session.get(URL, params={'id': id}, stream=True)
    token = get_confirm_token(response)

    if token:
        params = {'id': id, 'confirm': token}
        response = session.get(URL, params=params, stream=True)

    save_response_content(response, destination)
    return destination

def get_confirm_token(response):
    for key, value in response.cookies.items():
        if key.startswith('download_warning'):
            return value
    return None

def save_response_content(response, destination):
    CHUNK_SIZE = 32768
    with open(destination, "wb") as f:
        for chunk in response.iter_content(CHUNK_SIZE):
            if chunk: # filter out keep-alive new chunks
                f.write(chunk)

def extract_drive_id(url_or_id: str) -> str:
    if not url_or_id:
        return None
    if 'drive.google.com' in url_or_id:
        match = re.search(r'/d/([a-zA-Z0-9_-]+)', url_or_id)
        if match:
            return match.group(1)
    # If it's already an ID, just return it
    if re.match(r'^[a-zA-Z0-9_-]+$', url_or_id):
        return url_or_id
    return None
