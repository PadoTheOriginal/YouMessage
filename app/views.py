from flask import Flask, render_template, request, jsonify, make_response, session, redirect
from flask_socketio import SocketIO, emit, join_room, leave_room
from random import randint
import pickle
import os
import glob
from models.message import *
from models.user import *
from models.chat import *

app = Flask("YouMessage", template_folder="./content",
            static_folder="./content")
app.config['TEMPLATES_AUTO_RELOAD'] = True
socketio = SocketIO(app, max_http_buffer_size=1024 * 1024 * 1024, async_mode="eventlet")

chats = Chats()

users = Users()

if (os.path.isfile("data.pickle")):
    with open("data.pickle", "rb") as f:
        users = pickle.load(f)

# make sure to remove all the temporary files on restart
files = glob.glob('content\shared_files\*')
for f in files:
    os.remove(f)
    
@app.route('/', defaults={'chat': ''})
@app.route('/<path:chat>')
def index(chat):
    global chats
    
    chat = '/' + chat
    
    chatroom = chats.get_chat(chat)
    
    response = make_response(render_template("index.jinja2", messages=chatroom.messages))
                             
    response.set_cookie('home', expires=0)
    
    return response

@socketio.on('user_disconnected')
def user_disconnect(chat:str, username:str):
    global chats, users, process
    
    print(chat, 'User disconnected:', username)
    
    if ((chat.isspace() or len(chat) == 0)):
        return False
    
    if (not users.exists(username)):
        return False
    
    user = users.get_user_by_username(username)
    
    chatroom = chats.get_chat(chat)
         
    if (chatroom.is_user_in_chat(user.username)):
        chatroom.remove_user_from_chat(user)
        
        new_message = chatroom.add_new_message(Message("Announce", f"{user.username} has left the chat", user))

        emit(f'new_message{chat}', {"Message": new_message.toJSON()}, broadcast=True, include_self=True)
        
        emit(f'users_in_chat{chat}', {"Users": chatroom.usernames_of_users_in_chat()}, broadcast=True, include_self=True)
             
@socketio.on('user_connected')
def user_connected(chat:str, username:str):
    global chats, users
    
    print(chat, 'User connected:', username)
    
    if ((chat.isspace() or len(chat) == 0) or 
        (username.isspace() or len(username) == 0)):
        return False
    
    if (len(username) > 70):
        return False
    
    if (not users.exists(username)):
        return False
    
    chatroom = chats.get_chat(chat)

    if (not chatroom.is_user_in_chat(username)):
        user = users.get_user_by_username(username)
        
        chatroom.add_user_in_chat(user)
        
        new_message = chatroom.add_new_message(Message("Announce", f"{username} has joined the chat", user))
        
        emit(f'new_message{chat}', {"Message": new_message.toJSON()}, broadcast=True, include_self=True)
        
        emit(f'users_in_chat{chat}', {"Users": chatroom.usernames_of_users_in_chat()}, broadcast=True, include_self=True)
    
@socketio.on("send_message")
def send_message(chat:str, username:str, message:str):
    global chats, users
    
    if ((chat.isspace() or len(chat) == 0) or 
        (username.isspace() or len(username) == 0) or 
        (message.isspace() or len(message) == 0)):
        return False
    
    if (len(username) > 70 or len(message) > 2000):
        return False
    
    if (not users.exists(username)):
        return False
    
    chatroom = chats.get_chat(chat)
    
    new_message = chatroom.add_new_message(Message("Message", message, users.get_user_by_username(username)))

    emit(f'new_message{chat}', {"Message": new_message.toJSON()}, broadcast=True)
    
    return True

@socketio.on("user_typing")
def user_typing(chat:str, username:str):
    global chats, users
    
    if ((chat.isspace() or len(chat) == 0) or 
        (username.isspace() or len(username) == 0)):
        return False
    
    if (len(username) > 70):
        return False
    
    if (not users.exists(username)):
        return False
    
    emit(f'user_typing{chat}', {"Username": username}, broadcast=True, include_self=False)
    
    return True

@socketio.on("call_data")
def call_data(chat:str, username:str, stream:str):
    global chats, users
    
    if ((chat.isspace() or len(chat) == 0) or 
        (username.isspace() or len(username) == 0)):
        return False
    
    if (len(username) > 70):
        return False
    
    if (not users.exists(username)):
        return False
    
    emit(f'call_data{chat}', {"Stream": stream}, broadcast=True, include_self=False)
    
    return True

@socketio.on("join_call")
def join_call(chat:str, username:str):
    global chats, users

    if ((chat.isspace() or len(chat) == 0) or 
        (username.isspace() or len(username) == 0)):
        return False
    
    if (len(username) > 70):
        return False
    
    if (not users.exists(username)):
        return False
    
    if chat not in chats:
        chats[chat] = []

    join_room(chat)

@socketio.on("leave_call")
def leave_call(chat:str, username:str):
    global chats, users

    if ((chat.isspace() or len(chat) == 0) or 
        (username.isspace() or len(username) == 0)):
        return False
    
    if (len(username) > 70):
        return False
    
    if (not users.exists(username)):
        return False
    
    if chat not in chats:
        chats[chat] = []

    leave_room(chat)

@socketio.on("send_file")
def send_file(chat:str, username:str, filename:str, filedata:bytes):
    global chats, users
    
    if ((chat.isspace() or len(chat) == 0) or 
        (username.isspace() or len(username) == 0) or 
        (filename.isspace() or len(filename) == 0)):
        return False
    
    if len(username) > 70:
        return False
    
    if (not users.exists(username)):
        return False
    
    chatroom = chats.get_chat(chat)
    
    new_filename = filename
    fileextention = filename.split('.')[-1].lower()
    
    for i in range(1, 1000):
        if not os.path.exists(f'content/shared_files/{new_filename}'):
            with open(f'content/shared_files/{new_filename}', "wb") as f:
                f.write(filedata)
                
            break;
                
        new_filename = f'({i}) {filename}'
      
    if fileextention in ['png', 'jpg', 'jpeg', 'gif', 'webp']:  
        new_message = Message("Image", new_filename, users.get_user_by_username(username))
    
    elif fileextention in ['wav', 'mp3', 'm4a', 'ogg', 'aac', 'aiff']:
        new_message = Message("Audio", new_filename, users.get_user_by_username(username))
    
    elif fileextention in ['mp4', 'mkv', 'avi', 'ogv', 'mov', 'webm', 'wmv', 'm4v']:
        new_message = Message("Video", new_filename, users.get_user_by_username(username))
    
    else:
        new_message = Message("File", new_filename, users.get_user_by_username(username))
    
    new_message = chatroom.add_new_message(new_message)
    
    emit(f'new_message{chat}', {"Message": new_message.toJSON()}, broadcast=True)
    
    return True

@socketio.on("save_username")
def save_username(chat:str, username:str):
    global chats, users
    
    if (len(username) > 64 or (username.isspace() or len(username) == 0)):
        return ""
    
    while True:
        username_id = randint(1, 9999)
        username_with_id = f"{username}#{username_id:04n}"
        
        if (not users.exists(username_with_id)):
            user = users.add_user(User(username_with_id, request.sid))
            save_data()

            chatroom = chats.get_chat(chat)
            if (not chatroom.is_user_in_chat(user)):
                chatroom.add_user_in_chat(user)
                
                new_message = chatroom.add_new_message(Message("Announce", f"{user.username} has joined the chat", user))

                emit(f'new_message{chat}', {"Message": new_message.toJSON()}, broadcast=True, include_self=True)

            return username_with_id
        
@socketio.on("validate_username")
def validate_username(username:str):
    global users
    return users.exists(username)
    
def save_data():
    global users, chats
    with open("data.pickle", "wb") as f:
        data = users
        pickle.dump(data, f)
        