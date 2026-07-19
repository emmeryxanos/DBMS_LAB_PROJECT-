import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import dashboard, patients, interactions, portal, medicines, prescriptions, account, appointments, access, reports

app = FastAPI(title="MedTrack API", version="1.0.0")

_default_origins = "http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000"
allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router,     prefix="/api/dashboard",  tags=["Dashboard"])
app.include_router(patients.router,      prefix="/api/patients",   tags=["Patients"])
app.include_router(interactions.router,  prefix="/api",            tags=["Interactions"])
app.include_router(portal.router,        prefix="/api/portal",     tags=["Patient Portal"])
app.include_router(medicines.router,     prefix="/api",            tags=["Medicines"])
app.include_router(prescriptions.router, prefix="/api",            tags=["Prescriptions"])
app.include_router(account.router,       prefix="/api/account",    tags=["Account"])
app.include_router(appointments.router,  prefix="/api/appointments", tags=["Appointments"])
app.include_router(access.router,        prefix="/api/access",     tags=["Access"])
app.include_router(reports.router,       prefix="/api/reports",    tags=["Reports"])

@app.get("/")
def root():
    return {"status": "MedTrack API running"}
