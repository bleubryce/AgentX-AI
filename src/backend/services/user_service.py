from typing import Optional, List, Dict
from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import HTTPException, status
from ..models.user import User, UserCreate, UserUpdate, UserInDB, SessionInfo
from ..core.deps import get_password_hash, verify_password
from ..db.mongodb import mongodb_client
from ..core.config import settings
from ..core.security import SecurityUtils
from ..core.cache import Cache
from motor.motor_asyncio import AsyncIOMotorDatabase

class UserService:
    """Service for handling user-related operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.users
        self.sessions_collection = mongodb_client.get_collection("sessions")

    async def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        user = await self.collection.find_one({"_id": ObjectId(user_id)})
        if user:
            return User(**user)
        return None

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        user = await self.collection.find_one({"email": email})
        if user:
            return User(**user)
        return None

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user."""
        # Check if email already exists
        if await self.get_by_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user with hashed password
        user_in_db = UserInDB(
            **user_data.dict(),
            hashed_password=SecurityUtils.get_password_hash(user_data.password),
            verification_token=SecurityUtils.generate_verification_token()
        )
        
        # Insert into database
        result = await self.collection.insert_one(user_in_db.dict(by_alias=True))
        
        # Get created user
        user = await self.get_by_id(result.inserted_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        return user

    async def update_user(self, user_id: str, user_update: UserUpdate) -> Optional[User]:
        """Update user."""
        update_dict = user_update.dict(exclude_unset=True)
        if "password" in update_dict:
            update_dict["hashed_password"] = get_password_hash(update_dict.pop("password"))
        update_dict["updated_at"] = datetime.utcnow()
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": update_dict},
            return_document=True
        )
        if result:
            # Clear user cache
            await Cache.delete(f"user:{user_id}")
            return User(**result)
        return None

    async def delete_user(self, user_id: str) -> bool:
        """Delete user."""
        result = await self.collection.delete_one({"_id": ObjectId(user_id)})
        if result.deleted_count:
            # Clear user cache
            await Cache.delete(f"user:{user_id}")
            return True
        return False

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user."""
        user = await self.get_user_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    async def update_last_login(self, user_id: str) -> None:
        """Update user's last login time."""
        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "last_login": datetime.utcnow(),
                    "failed_login_attempts": 0
                }
            }
        )

    async def increment_failed_login_attempts(self, user_id: str) -> None:
        """Increment failed login attempts."""
        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$inc": {"failed_login_attempts": 1}}
        )

    async def set_password_reset_token(self, user_id: str) -> Optional[str]:
        """Set password reset token."""
        token = ObjectId().hex
        expires = datetime.utcnow() + timedelta(hours=24)
        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "password_reset_token": token,
                    "password_reset_expires": expires
                }
            }
        )
        return token

    async def reset_password(self, user_id: str, new_password: str) -> bool:
        """Reset user password."""
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "hashed_password": get_password_hash(new_password),
                    "password_reset_token": None,
                    "password_reset_expires": None
                }
            }
        )
        return result.modified_count > 0

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None
    ) -> List[User]:
        """List users with pagination and filtering."""
        query = {}
        if is_active is not None:
            query["is_active"] = is_active
            
        cursor = self.collection.find(query).skip(skip).limit(limit)
        users = await cursor.to_list(length=limit)
        return [User(**user) for user in users]

    async def count_users(self, is_active: Optional[bool] = None) -> int:
        """Count users with optional filtering."""
        query = {}
        if is_active is not None:
            query["is_active"] = is_active
        return await self.collection.count_documents(query)

    # Session Management Methods
    async def add_session(
        self,
        user_id: str,
        session_id: str,
        ip_address: str,
        device_info: str
    ) -> None:
        """Add a new session for a user."""
        session_data = {
            "user_id": ObjectId(user_id),
            "session_id": session_id,
            "ip_address": ip_address,
            "device_info": device_info,
            "created_at": datetime.utcnow(),
            "last_active": datetime.utcnow(),
            "is_active": True
        }
        await self.sessions_collection.insert_one(session_data)
        
        # Update user's active sessions
        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$addToSet": {"active_sessions": session_id}}
        )

    async def verify_session(self, user_id: str, session_id: str) -> bool:
        """Verify if a session is valid."""
        session = await self.sessions_collection.find_one({
            "user_id": ObjectId(user_id),
            "session_id": session_id,
            "is_active": True
        })
        if session:
            # Update last active timestamp
            await self.sessions_collection.update_one(
                {"_id": session["_id"]},
                {"$set": {"last_active": datetime.utcnow()}}
            )
            return True
        return False

    async def remove_session(self, user_id: str, session_id: Optional[str] = None) -> bool:
        """Remove a session or all sessions for a user."""
        query = {"user_id": ObjectId(user_id)}
        if session_id:
            query["session_id"] = session_id
            
        # Deactivate sessions
        result = await self.sessions_collection.update_many(
            query,
            {"$set": {"is_active": False}}
        )
        
        if result.modified_count > 0:
            # Update user's active sessions list
            if session_id:
                await self.collection.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$pull": {"active_sessions": session_id}}
                )
            else:
                await self.collection.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": {"active_sessions": []}}
                )
            return True
        return False

    async def get_active_sessions(self, user_id: str) -> List[SessionInfo]:
        """Get all active sessions for a user."""
        sessions = await self.sessions_collection.find({
            "user_id": ObjectId(user_id),
            "is_active": True
        }).to_list(length=None)
        
        return [
            SessionInfo(
                session_id=session["session_id"],
                device_info=session["device_info"],
                ip_address=session["ip_address"],
                last_active=session["last_active"].isoformat(),
                created_at=session["created_at"].isoformat()
            )
            for session in sessions
        ]

    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions."""
        expiry_threshold = datetime.utcnow() - timedelta(days=7)
        expired_sessions = await self.sessions_collection.find({
            "last_active": {"$lt": expiry_threshold},
            "is_active": True
        }).to_list(length=None)
        
        if expired_sessions:
            session_ids = [session["session_id"] for session in expired_sessions]
            user_ids = [session["user_id"] for session in expired_sessions]
            
            # Deactivate expired sessions
            await self.sessions_collection.update_many(
                {"_id": {"$in": [session["_id"] for session in expired_sessions]}},
                {"$set": {"is_active": False}}
            )
            
            # Remove expired sessions from user's active sessions
            for user_id in set(user_ids):
                await self.collection.update_one(
                    {"_id": user_id},
                    {"$pull": {"active_sessions": {"$in": session_ids}}}
                )
            
            return len(expired_sessions)
        return 0

    async def get_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        user_dict = await self.collection.find_one({"_id": ObjectId(user_id)})
        return User(**user_dict) if user_dict else None

    async def get_by_email(self, email: str) -> Optional[UserInDB]:
        """Get user by email."""
        user_dict = await self.collection.find_one({"email": email})
        return UserInDB(**user_dict) if user_dict else None

    async def verify_email(self, token: str) -> bool:
        """Verify user's email."""
        result = await self.collection.update_one(
            {
                "verification_token": token,
                "is_email_verified": False
            },
            {
                "$set": {
                    "is_email_verified": True,
                    "verification_token": None,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return bool(result.modified_count)

    async def request_password_reset(self, email: str) -> Optional[str]:
        """Request password reset and return token."""
        user = await self.get_by_email(email)
        if not user:
            return None
        
        token = SecurityUtils.generate_password_reset_token()
        expires = datetime.utcnow() + timedelta(hours=24)
        
        await self.collection.update_one(
            {"_id": user.id},
            {
                "$set": {
                    "password_reset_token": token,
                    "password_reset_expires": expires,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return token

    async def reset_password(self, token: str, new_password: str) -> bool:
        """Reset user's password using reset token."""
        result = await self.collection.update_one(
            {
                "password_reset_token": token,
                "password_reset_expires": {"$gt": datetime.utcnow()}
            },
            {
                "$set": {
                    "hashed_password": SecurityUtils.get_password_hash(new_password),
                    "password_reset_token": None,
                    "password_reset_expires": None,
                    "last_password_change": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return bool(result.modified_count)

    async def increment_failed_login(self, user_id: str) -> None:
        """Increment failed login attempts and possibly lock account."""
        user = await self.get_by_id(user_id)
        if not user:
            return
        
        failed_attempts = user.failed_login_attempts + 1
        update_data = {
            "failed_login_attempts": failed_attempts,
            "updated_at": datetime.utcnow()
        }
        
        # Lock account after 5 failed attempts
        if failed_attempts >= 5:
            update_data["account_locked_until"] = datetime.utcnow() + timedelta(minutes=15)
        
        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )

    async def is_valid_session(self, user_id: str, session_id: str) -> bool:
        """Check if session is valid for user."""
        user = await self.get_by_id(user_id)
        if not user:
            return False
        
        return any(
            session.get("session_id") == session_id
            for session in user.active_sessions
        )

    async def invalidate_session(
        self,
        user_id: str,
        session_id: str
    ) -> bool:
        """Invalidate user session."""
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$pull": {
                    "active_sessions": {"session_id": session_id}
                }
            }
        )
        return bool(result.modified_count)

    async def invalidate_all_sessions(self, user_id: str) -> bool:
        """Invalidate all user sessions."""
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "active_sessions": [],
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return bool(result.modified_count) 