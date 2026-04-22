from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import json

import models, schemas, auth
from database import get_db
import email_service
from routers.auth import require_manager

router = APIRouter(prefix="/submissions", tags=["submissions"])

@router.get("/all", response_model=List[schemas.SubmissionWithUser])
def get_all_submissions(
    _manager: models.User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """Manager-only: returns every submission with the submitting CSM's name and email."""
    submissions = db.query(models.Submission).filter(
        models.Submission.status == "completed"
    ).order_by(models.Submission.last_updated.desc()).all()
    result = []
    for sub in submissions:
        item = schemas.SubmissionWithUser(
            id=sub.id,
            user_id=sub.user_id,
            has_updates=bool(sub.has_updates),
            customer_name=sub.customer_name,
            form_data=sub.form_data,
            current_section=sub.current_section,
            status=sub.status,
            last_updated=sub.last_updated,
            csm_name=sub.user.name if sub.user else None,
            csm_email=sub.user.email if sub.user else None,
        )
        result.append(item)
    return result


@router.get("/", response_model=List[schemas.SubmissionResponse])
def get_submissions(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    submissions = db.query(models.Submission).filter(models.Submission.user_id == current_user.id).all()
    return submissions

@router.get("/{submission_id}", response_model=schemas.SubmissionResponse)
def get_submission(submission_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.Submission).filter(models.Submission.id == submission_id)
    # Managers can view any submission; CSMs only their own
    if current_user.role != "manager":
        query = query.filter(models.Submission.user_id == current_user.id)
    submission = query.first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission

@router.post("/", response_model=schemas.SubmissionResponse)
def create_submission(submission: schemas.SubmissionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_submission = models.Submission(
        user_id=current_user.id,
        customer_name=submission.customer_name,
        form_data=submission.form_data,
        current_section=submission.current_section,
        status=submission.status
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)
    return new_submission

@router.put("/{submission_id}", response_model=schemas.SubmissionResponse)
def update_submission(
    submission_id: int, 
    submission_update: schemas.SubmissionUpdate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id, models.Submission.user_id == current_user.id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    previous_status = submission.status
    
    if submission_update.customer_name is not None:
        submission.customer_name = submission_update.customer_name
    if submission_update.form_data is not None:
        submission.form_data = submission_update.form_data
    if submission_update.current_section is not None:
        submission.current_section = submission_update.current_section
    if submission_update.status is not None:
        # Check if we are completing a draft that was already previously completed
        if previous_status != "completed" and submission_update.status == "completed":
            if submission.was_completed:
                submission.has_updates = 1 # Mark as updated
            else:
                submission.was_completed = 1 # Mark as once completed
        
        submission.status = submission_update.status
        
    # Notification Logic
    if previous_status != "completed" and submission.status == "completed":
        try:
            form_dict = json.loads(submission.form_data)
        except Exception:
            form_dict = {}
        
        is_update = form_dict.get("_has_been_submitted", False)
        form_dict["_has_been_submitted"] = True
        submission.form_data = json.dumps(form_dict)

        csm_name = form_dict.get("csmName", current_user.name)
        csm_email = form_dict.get("csmEmail", current_user.email)

        background_tasks.add_task(
            email_service.send_submission_email,
            customer_name=submission.customer_name,
            csm_email=csm_email,
            csm_name=csm_name,
            is_update=is_update,
            submission_id=submission.id,
            pdf_base64=submission_update.pdf_base64
        )
        
    db.commit()
    db.refresh(submission)
    return submission
