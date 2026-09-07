import re
import requests

CHUNK_SIZE = 1024 * 1024  # 1 MB chunks


def extract_drive_file_id(url_or_id: str) -> str:
    """Extract a Google Drive file ID from a full URL or return bare ID as-is."""
    if not url_or_id:
        return ""
    # Match /d/{ID}/ or id={ID} patterns
    match = re.search(r"/d/([a-zA-Z0-9_-]+)", url_or_id)
    if match:
        return match.group(1)
    match = re.search(r"id=([a-zA-Z0-9_-]+)", url_or_id)
    if match:
        return match.group(1)
    # Assume it's already a raw file ID
    if re.match(r"^[a-zA-Z0-9_-]+$", url_or_id):
        return url_or_id
    return ""


def stream_drive_file(file_id: str, destination: str) -> str:
    """
    Download a large file from Google Drive to `destination`.
    Handles the virus-scan confirmation page that Google shows for files > ~100 MB.
    Returns the destination path.
    """
    session = requests.Session()
    download_url = "https://docs.google.com/uc?export=download"

    # Initial request — may trigger a virus-scan warning page
    response = session.get(download_url, params={"id": file_id}, stream=True, timeout=30)

    # Look for the download_warning confirmation token in cookies or page body
    confirm_token = None
    for key, value in response.cookies.items():
        if key.startswith("download_warning"):
            confirm_token = value
            break

    # If no cookie token, try scanning the response body for the confirm param
    if not confirm_token:
        try:
            content_snippet = response.content[:4096].decode("utf-8", errors="ignore")
            match = re.search(r'confirm=([0-9A-Za-z_-]+)', content_snippet)
            if match:
                confirm_token = match.group(1)
        except Exception:
            pass

    # Re-request with confirmation token if needed
    if confirm_token:
        response = session.get(
            download_url,
            params={"id": file_id, "confirm": confirm_token},
            stream=True,
            timeout=60,
        )

    response.raise_for_status()

    with open(destination, "wb") as f:
        for chunk in response.iter_content(CHUNK_SIZE):
            if chunk:
                f.write(chunk)

    return destination
