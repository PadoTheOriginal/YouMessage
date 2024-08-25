const socket = io();
var selected_files = [];
var recording = false;
var recorder;

$(function () {
    validateUsername();
    alignMessages();

    setTimeout(askPermissionToSendNotification, 2000);

    socket.on("connect", () => {
        console.log("connected");
    });

    socket.on("disconnect", () => {
        console.log("disconnected");
    });

    socket.on(`new_message${window.location.pathname}`, function (obj) {
        let message = obj.Message;
        let notificationBody = message.Value;

        GenerateMessage(message, message.Type);

        if (message.Type == 'Image')
            notificationBody = 'Sent you an Image';
        if (message.Type == 'Audio')
            notificationBody = 'Sent you an Audio';
        if (message.Type == 'Video')
            notificationBody = 'Sent you a Video';
        if (message.Type == 'File')
            notificationBody = 'Sent you a File';

        if (message.User != localStorage.getItem("username")) {
            askPermissionToSendNotification();

            document.getElementById('messageAudio').play();

            if (document.hidden) // Only show if user is not on website
                new Notification(message.User, { body: notificationBody });
        }
    });

    $("#messageBox").on('paste', function (e) {
        var clipboardData;

        clipboardData = (e.originalEvent || e).clipboardData;

        if (!clipboardData.files.length) {
            return;
        }

        e.preventDefault();

        e.stopPropagation();
        e.preventDefault();

        selectFiles(clipboardData.files);
    });
});

function askPermissionToSendNotification() {
    if (Notification.permission == "granted")
        return 0;

    Notification.requestPermission().then();

    new SnackBar({
        message: "Please allow notifications in your browser.",
        status: "warning",
        position: "tl",
        dismissible: true,
        timeout: 10000
    });
}

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

function sendFile() {
    if (!validateUsername())
        return 0;

    sendFiles(selected_files).then(function () {
        $("#SelectedFileDiv").toggleClass("d-none");
        $("#MessageBoxDiv").toggleClass("d-none");
        selected_files = [];
        new SnackBar({
            message: "File sent sucessfully.",
            status: "success",
            position: "bm",
            dismissible: true,
            timeout: 3000
        });
    });

    async function sendFiles(files) {
        for (const selected_file of files) {
            let filename = selected_file.name;
            let filedata = await selected_file.arrayBuffer();
            let username = localStorage.getItem("username")
            let chatroom = window.location.pathname;

            socket.emit('send_file', chatroom, username, filename, filedata);
        }

        return true;
    }
}

function validateFiles(e) {
    selectFiles(e.files);
}

function selectFiles(files) {
    selected_files.push.apply(selected_files, files);

    if (selected_files.length > 0 && selected_files !== undefined) {
        $("#SelectedFileDiv > span").text(`Selected ${selected_files.length} file(s)`);

        $("#SelectedFileDiv").toggleClass("d-none");
        $("#MessageBoxDiv").toggleClass("d-none");
        $("#FileBtn").focus();
    }
}

function unselectFiles() {
    $("#SelectedFileDiv").toggleClass("d-none");
    $("#MessageBoxDiv").toggleClass("d-none");

    selected_files = []
}

function recordAudio() {
    if (recording) {
        recorder.stop();
        recorder.stream.getAudioTracks().forEach(function (track) { track.stop(); });
        recording = false;
        $("#recordBtn > .fa-microphone").removeClass("text-danger");
        $("#recordBtn > .fa-microphone").addClass("text-white");
    }
    else {
        navigator.mediaDevices.getUserMedia({
            audio: true
        }).then(function (stream) {
            recorder = new MediaRecorder(stream);
            recorder.start();
            recording = true;
            recorder.addEventListener('dataavailable', function (event) {
                let file = new File([event.data], 'AudioRecording.ogg', { type: 'audio/ogg', lastModified: new Date() });
                selectFiles([file]);
                new SnackBar({
                    message: "Audio recording completed.",
                    status: "success",
                    position: "bm",
                    dismissible: true,
                    timeout: 3000
                });
            });
            $("#recordBtn > .fa-microphone").addClass("text-danger");
            $("#recordBtn > .fa-microphone").removeClass("text-white");
        });
    }
}

function GenerateMessage(message, messageType) {
    let align = "", htmlTR = "";
    let last_user = $("#messagesArea .username:last-of-type").text();

    if (message.User == localStorage.getItem("username"))
        align = "ms-auto";

    if (message.User != last_user)
        htmlTR += `
        <span class="username ${align}">${message.User}</span>
        `;

    htmlTR += `
    <div class="${align} message">
    `;

    if (messageType == "Message")
        htmlTR += `<p class="message-content">${message.Value}</p>`;
    else if (messageType == "Image")
        htmlTR += `
                <p class="message-content"><img src="/content/shared_files/${message.Value}" alt="${message.Value}" onclick="this.requestFullscreen()"></p>
                `;
    else if (messageType == "Audio")
        htmlTR += `
                <p class="message-content"><audio src="/content/shared_files/${message.Value}" controls></audio></p>
                `;
    else if (messageType == "Video")
        htmlTR += `
                <p class="message-content"><video src="/content/shared_files/${message.Value}" controls></video></p>
                `;
    else if (messageType == "File")
        htmlTR += `
                <p class="message-content"><span class="file-card"><i class="fa-solid fa-file text-gray"></i> ${message.Value}</span></p>
                <a class="btn btn-primary btn-download" href="/content/shared_files/${message.Value}" target="_blank" download="true">
                    <i class="fa-solid fa-download text-white"></i>
                </a>
                `;

    htmlTR += `
    </div>
    `;

    document.getElementById('messagesArea').insertAdjacentHTML('beforeend', htmlTR)
    document.getElementById('messagesArea').scrollTop = document.getElementById('messagesArea').scrollHeight;
}
