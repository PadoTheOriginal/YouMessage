from models.user import User
from time import gmtime, strftime

messageIndex = 1

class Message():
    def __init__(self, message_type:str, value:str, user:User, replying_to = None):
        global messageIndex

        self.message_id:int = messageIndex
        self.message_type:str = message_type
        self.value:str = value
        self.user:User = user
        self.datetime:str = strftime("%Y-%m-%d %H:%M:%S", gmtime())
        self.replying_to:Message = replying_to
        messageIndex += 1
        
    def toJSON(self) -> dict:
        return {
            "MessageId": self.message_id,
            "Type": self.message_type,
            "Value": self.value,
            "User": self.user.username,
            "DateTime": self.datetime,
            "ReplyingTo": self.replying_to.toJSON() if self.replying_to else None
        }