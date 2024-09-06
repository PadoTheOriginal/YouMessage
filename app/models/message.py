from models.user import User
from time import gmtime, strftime

class Message():
    def __init__(self, message_type:str, value:str, user:User):
        self.message_type:str = message_type
        self.value:str = value
        self.user:User = user
        self.datetime:str = strftime("%Y-%m-%d %H:%M:%S", gmtime())
        
    def toJSON(self) -> dict:
        return {"Type": self.message_type, "Value": self.value, "User": self.user.username, "DateTime": self.datetime}