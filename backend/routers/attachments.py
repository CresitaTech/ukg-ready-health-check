from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
import shutil

import models, auth
from database import get_db

router = APIRouter(prefix="/attachments", tags=["attachments"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")

ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx",
    ".xls", ".xlsx", ".csv",
    ".ppt", ".pptx",
    ".png", ".jpg", ".jpeg",
    ".txt", ".zip",
}

MAX_FILE_SIZE_MB = 10


def get_submission_upload_dir(submission_id: int) -> str:
    path = os.path.join(UPLOAD_DIR, str(submission_id))
    os.makedirs(path, exist_ok=True)
    return path


@router.post("/{submission_id}")
async def upload_attachment(
    submission_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # Verify submission belongs to user
    submission = db.query(models.Submission).filter(
        models.Submission.id == submission_id,
        models.Submission.user_id == current_user.id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Validate extension
    _, ext = os.path.splitext(file.filename or "")
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' is not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {MAX_FILE_SIZE_MB}MB limit")

    upload_path = get_submission_upload_dir(submission_id)
    safe_filename = file.filename.replace("..", "").replace("/", "_").replace("\\", "_")
    dest = os.path.join(upload_path, safe_filename)

    with open(dest, "wb") as f:
        f.write(contents)

    return {
        "filename": safe_filename,
        "size": len(contents),
        "content_type": file.content_type,
    }


@router.get("/{submission_id}")
def list_attachments(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    submission = db.query(models.Submission).filter(
        models.Submission.id == submission_id,
        models.Submission.user_id == current_user.id,
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    upload_path = get_submission_upload_dir(submission_id)
    files = []
    for fname in os.listdir(upload_path):
        fpath = os.path.join(upload_path, fname)
        if os.path.isfile(fpath):
            files.append({"filename": fname, "size": os.path.getsize(fpath)})
    return files


@router.delete("/{submission_id}/{filename}")
def delete_attachment(
    submission_id: int,
    filename: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    submission = db.query(models.Submission).filter(
        models.Submission.id == submission_id,
        models.Submission.user_id == current_user.id,
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    upload_path = get_submission_upload_dir(submission_id)
    safe_filename = filename.replace("..", "").replace("/", "_").replace("\\", "_")
    fpath = os.path.join(upload_path, safe_filename)
    if not os.path.isfile(fpath):
        raise HTTPException(status_code=404, detail="File not found")
    os.remove(fpath)
    return {"detail": "Deleted"}
