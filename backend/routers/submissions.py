from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import json

import models, schemas, auth
from database import get_db
import email_service

router = APIRouter(prefix="/submissions", tags=["submissions"])

@router.get("/", response_model=List[schemas.SubmissionResponse])
def get_submissions(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    submissions = db.query(models.Submission).filter(models.Submission.user_id == current_user.id).all()
    return submissions

@router.get("/{submission_id}", response_model=schemas.SubmissionResponse)
def get_submission(submission_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id, models.Submission.user_id == current_user.id).first()
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
