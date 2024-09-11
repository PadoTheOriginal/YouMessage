
class User():
    username:str = ''
    sid:str = ''
    def __init__(self, username:str, sid:str):
        self.username:str = username
        self.sid:str = sid
    
    def toJSON(self) -> dict:
        return {"Username": self.username, "Sid": self.sid}
        
class Users():
    def __init__(self):
        self.users:list[User] = []
        
    def __iter__(self):
        for user in self.users:
            yield user.username
            
    def exists(self, username:str) -> str:
        return username in [x.username for x in self.users]
    
    def add_user(self, username:str, sid:str) -> User:
        user = User(username, sid)
        self.users.append(user)
        return user
    
    def add_user(self, user:User) -> User:
        self.users.append(user)
        return user
        
    def get_user_by_sid(self, sid:str) -> User:
        return next(user for user in self.users if user.sid == sid)
        
    def get_user_by_username(self, username:str) -> User:
        try:
            return next(user for user in self.users if user.username == username)
        except StopIteration:
            return None;