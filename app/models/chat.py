from models.message import *

class Chat():
    def __init__(self, chatroom:str):
        self.chatroom:str = chatroom 
        self.messages:list[Message] = []
        self.users_in_chat:list[User] = []
        self.users_in_call:list[User] = []
        
    def is_user_in_chat(self, username:str) -> bool:
        return any(user for user in self.users_in_chat if user.username == username)
    
    def add_user_in_chat(self, user_to_add:User) -> User:
        self.users_in_chat.append(user_to_add)
        return user_to_add
    
    def remove_user_from_chat(self, user_to_remove:User):
        self.users_in_chat.remove(user_to_remove)
        
    def usernames_of_users_in_chat(self) -> list[str]:
        return [user.username for user in self.users_in_chat]
    
    def add_new_message(self, new_message:Message) -> Message:
        self.messages.append(new_message)
        return new_message
    
    def get_message_by_id(self, message_id:int) -> Message:
        if not message_id:
            return None

        return next(message for message in self.messages if message.message_id == message_id)

    def get_all_messages(self) -> list[Message]:
        return self.messages
    
    def get_all_messages_JSON(self) -> list[dict]:
        return [message.toJSON() for message in self.messages]
        
    def add_user_in_call(self, user:User) -> User:
        self.users_in_call.append(user)
        return user
    
    def remove_user_from_call(self, user_to_remove:User):
        self.users_in_call.remove(user_to_remove)
        
    def get_usernames_of_users_in_call(self) -> list[str]:
        return [user.username for user in self.users_in_call]
        
    def get_users_in_call_JSON(self) -> list[dict]:
        return [user.toJSON() for user in self.users_in_call]
    
class Chats():
    def __init__(self):
        self.chats:list[Chat] = []
        
    def __iter__(self):
        for chat in self.chats:
            yield chat.chatroom
    
    def get_chat(self, chatroom:str) -> Chat:
        if not any(x.chatroom == chatroom for x in self.chats):
            self.chats.append(Chat(chatroom))
        
        return next(chat for chat in self.chats if chat.chatroom == chatroom)
        