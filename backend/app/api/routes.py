import logging
import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.api.models import Account, AccountCreate, AccountRead, AccountWithCode, AccountUpdate
from app.core.totp import get_totp_now, get_ttl

logger = logging.getLogger("uvicorn")
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
                **account.model_dump(exclude={"secret"}), 
                code=code, 
                ttl=ttl
            ))
        except Exception as e:
            # Handle invalid secrets gracefully but log the error
            logger.error(f"Error generating TOTP for account {account.id} ({account.name}): {e}")
            # Optionally we could return an error state, but for now skipping is safer than crashing
            continue
    return results

@router.post("/accounts", response_model=AccountRead)
def create_account(account: AccountCreate, session: Session = Depends(get_session)):
    # Validate Base32 format
    if not re.fullmatch(r'[A-Z2-7=]+', account.secret.upper()):
        raise HTTPException(status_code=400, detail="Invalid secret: must be Base32 (A-Z, 2-7)")

    db_account = Account.model_validate(account)
    session.add(db_account)
    session.commit()
    session.refresh(db_account)
    return db_account

@router.delete("/accounts/{account_id}")
def delete_account(account_id: int, session: Session = Depends(get_session)):
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    session.delete(account)
    session.commit()
    return {"ok": True}

@router.put("/accounts/{account_id}", response_model=AccountRead)
def update_account(account_id: int, account_update: AccountUpdate, session: Session = Depends(get_session)):
    db_account = session.get(Account, account_id)
    if not db_account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    account_data = account_update.model_dump(exclude_unset=True)
    for key, value in account_data.items():
        setattr(db_account, key, value)
        
    session.add(db_account)
    session.commit()
    session.refresh(db_account)
    return db_account
