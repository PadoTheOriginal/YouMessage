const socket = io();

$(function () {
    socket.on("connect", () => {
        console.log("connected");
    });

    socket.on("disconnect", () => {
        console.log("disconnected");
    });

    socket.on("updating_messages", function(obj) {
        $('.card-body').html('');
        for (const index in obj.Messages) {
            let message = obj.Messages[index];
            let align = "me-auto";

            if (message.User == $("#username").val()) {
                align = "ms-auto";
            }
            
            let htmlTR = `<span class="${align}">${message.User}: ${message.Message}</span><br />`;
            $('.card-body').append($(htmlTR));
        }
        
    });
});

function checkForEnter(e) {
    if (e.key == "Enter"){
        sendMessage();
    }
}

function sendMessage() {
    let username = $("#username").val();
    let message = $("#messageBox").val();

    if (!username.trim().length) {
        $("#username").focus();
        return 0;
    }

    if (!message.trim().length) {
        $("#messageBox").focus();
        return 0;
    }

    $.ajax({
        url: '/message',
        type: 'POST',
        data: {
            Message: message,
            Username: username
        },
        success: function (response) {
            if (response.success) {
                $("#username").prop("readonly", true);
                $("#messageBox").val("");
                socket.emit("update_clients", function() {});
            }
            else {
                alert(response);
            }
        },
        error: function () {
            alert("error");
        }
    }); 
}

function GetMessages() {
    $.ajax({
        url: '/message',
        type: 'GET',
        success: function (obj) {
            if (obj.success) {
                $('.card-body').html('');
                for (const index in obj.messages) {
                    let message = obj.messages[index];
                    let align = "me-auto";

                    if (message.User == $("#username").val()) {
                        align = "ms-auto";
                    }
                    
                    let htmlTR = `<span class="${align}">${message.User}: ${message.Message}</span><br />`;
                    $('.card-body').append($(htmlTR));
                }
            }
            else {
                alert(obj);
            }
        },
        error: function () {
            alert("error");
        }
    }); 
}
