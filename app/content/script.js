const socket = io();

$(function () {
    validateUsername();
    alignMessages();

    socket.on("connect", () => {
        console.log("connected");
    });

    socket.on("disconnect", () => {
        console.log("disconnected");
    });

    socket.on(`new_message${window.location.pathname}`, function (obj) {
        GenerateMessage(obj.Message);
    });
});

function alignMessages() {
    $('.username').each(function (i, e) {
        if ($(e).text() == localStorage.getItem("username"))
            $(e).addClass('ms-auto');
    });

    $('.message').each(function (i, e) {
        if ($(e).attr("username") == localStorage.getItem("username"))
            $(e).addClass('ms-auto');
    });
}

function validateUsername() {
    if (localStorage.getItem("username") == null) {
        reinsertUsername();
        return false;
    }

    socket.emit('validate_username', localStorage.getItem("username"), (exists) => {
        if (!exists)
            reinsertUsername();
    });

    if (localStorage.getItem("username") == null)
        return false;

    return true;

    function reinsertUsername() {
        $("#modalUsername").modal('show');
        $("#username").val('');
        $("#username").focus();
        localStorage.setItem("username", null);
    }
}

function saveUsername() {
    let username = $("#username").val();

    if (!username.trim().length) {
        $("#username").focus();
        return 0;
    }

    socket.emit('save_username', username, (username_with_id) => {
        if (!username_with_id.trim().length) {
            $("#username").focus();
            return 0;
        }
        localStorage.setItem("username", username_with_id);
        $("#modalUsername").modal('hide');
    });
}

function checkForEnter(e, func) {
    if (e.key == "Enter") {
        func();
    }
}

function sendMessage() {
    let username = localStorage.getItem("username");
    let message = $("#messageBox").val();

    if (!validateUsername())
        return 0;

    if (!message.trim().length) {
        $("#messageBox").focus();
        return 0;
    }

    let chatroom = window.location.pathname;

    socket.emit('send_message', chatroom, username, message);
    $("#messageBox").val("");
}

function GenerateMessage(message) {
    let align = "";

    if (message.User == localStorage.getItem("username")) {
        align = "ms-auto";
    }

    let htmlTR = `
            <span class="username ${align}">${message.User}</span>

            <div class="${align} message">
                <p class="message-content">${message.Message}</p>
            </div>
            <br />`;

    $('#messagesArea').append($(htmlTR));

    document.getElementById('messagesArea').scrollTop = document.getElementById('messagesArea').scrollHeight;
}
