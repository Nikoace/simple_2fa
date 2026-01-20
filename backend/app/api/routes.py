from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.api.models import Account, AccountCreate, AccountRead, AccountWithCode
from app.core.totp import get_totp_now, get_ttl

router = APIRouter()

@router.get("/accounts", response_model=List[AccountWithCode])
def read_accounts(session: Session = Depends(get_session)):
    accounts = session.exec(select(Account)).all()
    results = []
    for account in accounts:
        try:
            code = get_totp_now(account.secret)
            ttl = get_ttl(account.secret)
            results.append(AccountWithCode(
                **account.model_dump(), 
                code=code, 
                ttl=ttl
            ))
        except Exception:
            # Handle invalid secrets gracefully
            continue
    return results

@router.post("/accounts", response_model=AccountRead)
def create_account(account: AccountCreate, session: Session = Depends(get_session)):
    db_account = Account.model_validate(account)
    session.add(db_account)
    session.commit()
    session.refresh(db_account)
    return db_account
