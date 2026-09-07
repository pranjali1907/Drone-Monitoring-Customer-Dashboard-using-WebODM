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


def inspect_drive_file_header(file_id: str, destination: str, max_bytes: int = 40 * 1024 * 1024) -> str:
    """
    Download only the first `max_bytes` (default 40MB) of a large Drive file
    to `destination` for rapid header/metadata inspection without downloading gigabytes.
    """
    session = requests.Session()
    download_url = "https://docs.google.com/uc?export=download"

    response = session.get(download_url, params={"id": file_id}, stream=True, timeout=30)
    confirm_token = None
    for key, value in response.cookies.items():
        if key.startswith("download_warning"):
            confirm_token = value
            break

    if not confirm_token:
        try:
            snippet = response.content[:4096].decode("utf-8", errors="ignore")
            match = re.search(r'confirm=([0-9A-Za-z_-]+)', snippet)
            if match:
                confirm_token = match.group(1)
        except Exception:
            pass

    if confirm_token:
        response = session.get(
            download_url,
            params={"id": file_id, "confirm": confirm_token},
            stream=True,
            timeout=30,
        )

    response.raise_for_status()

    bytes_written = 0
    with open(destination, "wb") as f:
        for chunk in response.iter_content(CHUNK_SIZE):
            if chunk:
                f.write(chunk)
                bytes_written += len(chunk)
                if bytes_written >= max_bytes:
                    break

    return destination


def get_drive_file_metadata(file_id: str) -> dict:
    """
    Inspect HTTP response headers for a Google Drive file to deduce its size and filename.
    """
    session = requests.Session()
    download_url = "https://docs.google.com/uc?export=download"
    try:
        response = session.get(download_url, params={"id": file_id}, stream=True, timeout=15)
        # Extract filename if present in content-disposition
        cd = response.headers.get("content-disposition", "")
        filename = ""
        fn_match = re.search(r'filename="?([^";]+)"?', cd)
        if fn_match:
            filename = fn_match.group(1)

        length = response.headers.get("content-length")
        size_bytes = int(length) if length and length.isdigit() else None

        return {
            "file_id": file_id,
            "filename": filename or f"drive_file_{file_id}",
            "size_bytes": size_bytes,
            "content_type": response.headers.get("content-type", "application/octet-stream"),
        }
    except Exception as e:
        return {
            "file_id": file_id,
            "filename": f"drive_file_{file_id}",
            "size_bytes": None,
            "error": str(e),
        }

