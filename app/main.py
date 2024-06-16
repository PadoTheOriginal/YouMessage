from flask import Flask, render_template, request, jsonify, make_response, session, redirect
from flask_httpauth import HTTPBasicAuth
from flask_socketio import SocketIO, emit
import bcrypt
import os

app = Flask("YouMessage", template_folder="./content",
            static_folder="./content")
socketio = SocketIO(app)

"""
    Using Flask as the server
    Using SQLite as the database
    Using Jinja2, js, css for the frontend

    First Phase TODO

    1- A single chat room for all users
    2- Allow the user to send message and appear for other users
    3- A username is defined by what they put in the input
    4- Update messages in realtime
    5- Barebones html and css, just so it doesn't stink too much
    6- Open ports in router so it can be used anywhere
    
"""

messages = []

@app.route("/")
def index():
    global messages
    
    response = make_response(render_template("index.jinja2", messages=messages))
                             
    response.set_cookie('home', expires=0)
    
    return response


@app.route("/message", methods=['POST'])
def messagePOST():
    global messages
    
    messages.append({ "Message": request.form['Message'], "User": request.form['Username']})
    
    return jsonify(success=True)

@app.route("/message", methods=['GET'])
def messageGET():
    global messages
    
    return jsonify(success=True, messages=messages)

@socketio.on("update_clients")
def getMessagesAsync():
    global messages

    emit('updating_messages', {"Messages": messages}, broadcast=True)
    socketio.sleep(1)

if __name__ == "__main__":
    app.secret_key = os.urandom(19)
    
    if os.path.exists('./certificates'):
        app.run('0.0.0.0', 443, debug=True, use_reloader=True, ssl_context=('./certificates/cert.pem', './certificates/key.pem'))

    else:
        app.run('0.0.0.0', 7979, debug=True, use_reloader=True)
        