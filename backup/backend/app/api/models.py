from typing import Optional
from sqlmodel import Field, SQLModel

class AccountBase(SQLModel):
    name: str = Field(index=True)
    issuer: Optional[str] = None

class Account(AccountBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    secret: str

class AccountCreate(AccountBase):
    secret: str

class AccountUpdate(SQLModel):
    name: Optional[str] = None
    issuer: Optional[str] = None
    secret: Optional[str] = None

class AccountRead(AccountBase):
    id: int
    
class AccountWithCode(AccountRead):
    code: str
    ttl: int
