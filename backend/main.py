from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

import models
from database import engine

from routers import auth as auth_router
from routers import submissions as submissions_router
from routers import attachments as attachments_router

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Opallios CSM Intake API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://164.68.100.175:3008"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(submissions_router.router)
app.include_router(attachments_router.router)

@app.get("/")
def root():
    return {"message": "Welcome to the Opallios CSM Intake API"}
