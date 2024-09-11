const socket = io.connect(null, { port: 7979, rememberTransport: false, transports: ['websocket'], upgrade: false });
var selected_files = [];
var recording = false;
var muted = true;
var oncall = false;
var recorder;
var users_typing = [];
var users_typing_timeouts = [];
var chatroom = window.location.pathname;
var playbackBuffers = {};
var audioWorkletNodes = {};
var ctx;
var audiostream;

$(function () {
    validateUsername();
    setTimeout(askPermissionToSendNotification, 2000);

    socket.on("connect", () => {
        console.log("connected");

        username = localStorage.getItem("username")

        if (username !== null && username != "null")
            socket.emit('user_connected', chatroom, username, GenerateMessages);
    });

    socket.on("disconnect", () => {
        console.log("disconnected");
    });

    window.onbeforeunload = function () {
        socket.emit('user_disconnected', chatroom, username);
    }

    socket.on(`new_message${chatroom}`, function (obj) {
        let username = localStorage.getItem("username");
        if (username !== null && username != "null") {

            let message = obj.Message;
            let notificationBody = message.Value;

            if (message.Type == "Announce")
                GenerateAnnouncement(message);
            else
                GenerateMessage(message, message.Type);

            if (message.Type == 'Image')
                notificationBody = 'Sent you an Image';
            if (message.Type == 'Audio')
                notificationBody = 'Sent you an Audio';
            if (message.Type == 'Video')
                notificationBody = 'Sent you a Video';
            if (message.Type == 'File')
                notificationBody = 'Sent you a File';

            if (message.User != username) {
                askPermissionToSendNotification();

                if (message.Type == "Announce")
                    document.getElementById('announceAudio').play();
                else
                    document.getElementById('messageAudio').play();

                if (document.hidden) // Only show if user is not on website
                    new Notification(message.User, { body: notificationBody });
            }
        }
    });

    socket.on(`user_typing${chatroom}`, function (obj) {
        let username = localStorage.getItem("username");
        if (username !== null && username != "null") {
            let user_typing = obj.Username;

            if (!users_typing.includes(user_typing)) {
                users_typing.push(user_typing);

                setTimeout(function () {
                    users_typing.splice(users_typing.indexOf(user_typing), 1)
                }, 1000)

                users_typing.sort(function (a, b) {
                    var nameA = a.toLowerCase(), nameB = b.toLowerCase();
                    if (nameA < nameB) //sort string ascending
                        return -1;
                    if (nameA > nameB)
                        return 1;
                    return 0; //default return value (no sorting)
                });

                if (users_typing.length == 1)
                    $(".users-typing").text(users_typing[0] + " is typing...");
                else
                    $(".users-typing").text(users_typing.join(" and ") + " are typing...");

                $(".users-typing").removeClass("d-none");

                for (const timeout of users_typing_timeouts) {
                    clearTimeout(timeout);
                }
                users_typing_timeouts = [];

                users_typing_timeouts.push(setTimeout(function () {
                    $(".users-typing").addClass("d-none");
                },
                    1800));
            }
        }
    });

    socket.on(`call_data`, function (obj) {
        if (playbackBuffers[obj.Username]) {
            let buffer = new Float32Array(obj.Stream);
            playbackBuffers[obj.Username].buffer.set(buffer, playbackBuffers[obj.Username].cursor);
            playbackBuffers[obj.Username].cursor += buffer.length;
            playbackBuffers[obj.Username].cursor %= buffer.length * 4;
        }
    });

    socket.on(`joined_call`, async function (obj) {
        obj.Users.forEach(function (user) {
            userJoinedCall(user.Username);
        });
    });

    socket.on(`left_call`, async function (obj) {
        userLeftCall(obj.Username);
    });

    $(".listen-clipboard").on('paste', function (e) {
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

function validateUsername() {
    if (localStorage.getItem("username") == null || localStorage.getItem("username") == "null") {
        reinsertUsername();
        return false;
    }

    socket.emit('validate_username', localStorage.getItem("username"), (exists) => {
        if (!exists)
            reinsertUsername();
    });

    if (localStorage.getItem("username") == null || localStorage.getItem("username") == "null")
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

    socket.emit('save_username', chatroom, username, (obj) => {
        if (!obj.username_with_id.trim().length) {
            $("#username").focus();
            return 0;
        }

        localStorage.setItem("username", obj.username_with_id);
        $("#modalUsername").modal('hide');

        GenerateMessages(obj.messages);
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
    
    socket.emit('send_message', chatroom, username, message);
    $("#messageBox").val("");
    
    setTimeout(function () {
        $("#messageBtn").addClass("d-none");
        $("#recordBtn").removeClass("d-none");
    }, 100);
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

function verifyMessage(e) {
    let message = $("#messageBox").val();

    if (message.length) {
        let username = localStorage.getItem("username");

        $("#messageBtn").removeClass("d-none");
        $("#recordBtn").addClass("d-none");

        checkForEnter(e, sendMessage);

        socket.emit('user_typing', chatroom, username);
    }
    else {
        $("#messageBtn").addClass("d-none");
        $("#recordBtn").removeClass("d-none");
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
                <p class="message-content"><img src="/content/shared_files/${message.Value}?v=${Math.random()}" alt="${message.Value}" onclick="this.requestFullscreen()"></p>
                `;
    else if (messageType == "Audio")
        htmlTR += `
                <p class="message-content"><audio src="/content/shared_files/${message.Value}?v=${Math.random()}" controls></audio></p>
                `;
    else if (messageType == "Video")
        htmlTR += `
                <p class="message-content"><video src="/content/shared_files/${message.Value}?v=${Math.random()}" controls></video></p>
                `;
    else if (messageType == "File")
        htmlTR += `
                <p class="message-content"><span class="file-card"><i class="fa-solid fa-file text-gray"></i> ${message.Value}</span></p>
                <a class="btn btn-primary btn-download" href="/content/shared_files/${message.Value}?v=${Math.random()}" target="_blank" download="true">
                    <i class="fa-solid fa-download text-white"></i>
                </a>
                `;

    htmlTR += `
    </div>
    `;

    document.getElementById('messagesArea').insertAdjacentHTML('beforeend', htmlTR)
    document.getElementById('messagesArea').scrollTop = document.getElementById('messagesArea').scrollHeight;
}

function GenerateAnnouncement(message) {
    let htmlTR = `
        <span class="announce">${message.Value}</span>
    `;

    document.getElementById('messagesArea').insertAdjacentHTML('beforeend', htmlTR)
    document.getElementById('messagesArea').scrollTop = document.getElementById('messagesArea').scrollHeight;
}

function GenerateMessages(messages) {
    for (const message of messages) {
        if (message.Type == "Announce")
            GenerateAnnouncement(message);
        else
            GenerateMessage(message, message.Type);
    }
}

function joinCall() {
    ctx = new AudioContext();

    let username = localStorage.getItem("username");

    socket.emit("join_call", chatroom, username);

    $("#joinCallBtn").addClass('d-none');
    $(".call-controls").removeClass('d-none');
}

function leaveCall() {
    let username = localStorage.getItem("username");

    socket.emit("leave_call", chatroom, username);

    $("#joinCallBtn").removeClass('d-none');
    $(".call-controls").addClass('d-none');

    src.context.close()
    src.disconnect()
    audiostream.getTracks().forEach(function (track) { track.stop() });
}

async function toggleMicrophone() {
    muted = !muted;

    $("#micBtn > i").toggleClass("fa-microphone-slash");
    $("#micBtn > i").toggleClass("fa-microphone");

    audiostream = await navigator.mediaDevices.getUserMedia({
        audio: true, video: false
    });

    await ctx.audioWorklet.addModule('./content/js/record-processor.js');
    window.src = ctx.createMediaStreamSource(audiostream);

    let processor = new AudioWorkletNode(ctx, 'record-processor');

    let recordBuffer;

    processor.port.onmessage = (e) => {
        if (e.data.eventType === 'buffer') {
            recordBuffer = new Float32Array(e.data.buffer);
        }
        if (e.data.eventType === 'data' && !muted) {
            let username = localStorage.getItem("username");
            socket.emit('call_data', chatroom, username, recordBuffer.slice(e.data.start, e.data.end).buffer);
        }
    }

    src.connect(processor);
}

async function userJoinedCall(username) {
    if (!audioWorkletNodes[username]) {
        await ctx.audioWorklet.addModule('./content/js/playback-processor.js');
        audioWorkletNodes[username] = new AudioWorkletNode(ctx, 'playback-processor');

        audioWorkletNodes[username].port.onmessage = (e) => {
            if (e.data.eventType === 'buffer') {
                playbackBuffers[username] = { cursor: 0, buffer: new Float32Array(e.data.buffer) };
            }
        }

        audioWorkletNodes[username].connect(ctx.destination);
    }
}

function userLeftCall(username) {
    audioWorkletNodes[username].disconnect();
    audioWorkletNodes[username] = undefined;
    playbackBuffers[username] = undefined;
}