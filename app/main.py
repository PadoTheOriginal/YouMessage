from flask import Flask, render_template, request, jsonify, make_response, session, redirect
from flask_socketio import SocketIO, emit
import os
from random import randint
import pickle
import glob

app = Flask("YouMessage", template_folder="./content",
            static_folder="./content")
app.config['TEMPLATES_AUTO_RELOAD'] = True
socketio = SocketIO(app, max_http_buffer_size=1024 * 1024 * 1024)

chats = {}

usernames = []

@app.route('/', defaults={'chat': ''})
@app.route('/<path:chat>')
def index(chat):
    global chats
    
    chat = '/' + chat
    
    if chat not in chats:
        chats[chat] = []
    
    response = make_response(render_template("index.jinja2", messages=chats[chat]))
                             
    response.set_cookie('home', expires=0)
    
    return response

@socketio.on("send_message")
def send_message(chat:str, username:str, message:str):
    global chats
    
    if ((chat.isspace() or len(chat) == 0) or 
        (username.isspace() or len(username) == 0) or 
        (message.isspace() or len(message) == 0)):
        return False
    
    if (len(username) > 70 or len(message) > 2000):
        return False
    
    if (username not in usernames):
        return False
    
    if chat not in chats:
        chats[chat] = []
    
    message = { "Type": "Message", "Value": message, "User": username}
    
    chats[chat].append(message)

    emit(f'new_message{chat}', {"Message": message}, broadcast=True)
    
    return True

@socketio.on("send_file")
def send_file(chat:str, username:str, filename:str, filedata:bytes):
    global chats
    
    if chat not in chats:
        chats[chat] = []
    
    new_filename = filename
    
    for i in range(1, 1000):
        if not os.path.exists(f'content/shared_files/{new_filename}'):
            with open(f'content/shared_files/{new_filename}', "wb") as f:
                f.write(filedata)
                
            break;
                
        new_filename = f'({i}) {filename}'
            
    
    message = {"Type": "File", "Value": new_filename, "User": username}
    
    chats[chat].append(message)
    
    emit(f'new_message{chat}', {"Message": message}, broadcast=True)
    
    return True

@socketio.on("save_username")
def save_username(username:str):
    global usernames
    
    if (len(username) > 64 or (username.isspace() or len(username) == 0)):
        return ""
    
    while True:
        username_id = randint(1, 9999)
        username_with_id = f"{username}#{username_id:04n}"
        
        if (username_with_id not in usernames):
            usernames.append(username_with_id)
            save_data()
            return username_with_id


@socketio.on("validate_username")
def validate_username(username:str):
    global usernames
    return username in usernames
    
def save_data():
    global usernames, chats
    with open("data.pickle", "wb") as f:
        data = usernames
        pickle.dump(data, f)
        

if __name__ == "__main__":
    if (os.path.isfile("data.pickle")):
        with open("data.pickle", "rb") as f:
            usernames = pickle.load(f)
    
    # make sure to remove all the temporary files on restart
    files = glob.glob('content\shared_files\*')
    for f in files:
        os.remove(f)
    
    app.secret_key = os.urandom(19)
    
    if os.path.exists('../certificates'):
        app.run('0.0.0.0', 7979, debug=False, use_reloader=True, ssl_context=('../certificates/pado_ddnsking_com.pem', '../certificates/private.key'))

    else:
        app.run('0.0.0.0', 7979, debug=True, use_reloader=True)
        