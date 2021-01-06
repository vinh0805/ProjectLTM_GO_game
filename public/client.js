// var socket = io("http://192.168.43.6:3000");
var socket = io("http://localhost:3000");
let currentRoom = -1;

// login successfully
socket.on("01-SERVER_ROOMS_LIST", function(data){
    alert("Login successfully!");
    console.log(data);

    $("#account").val("");
    $("#password").val("");

    // update data of roomList
    for(let i = 0; i < data.length; i++) {
        let roomId = "#room" + i;
        let roomSpanId = "#roomSpan" + i;
        $(roomId).data("number-player", data[i]);
        $(roomSpanId).html(data[i]);
    }

    $("#loginForm").hide(1000);
    $("#roomList").show(500);
    $("#inRoom").hide();
});
// login failed
socket.on("02-SERVER_LOGIN_INCORRECT", function(){
    alert("Login failed!");
});

// go in room successfully, receiver list of players in room
socket.on("11-SERVER_PLAYERS_IN_ROOM", function(data){
    // show player name
    $("#player1Name").html(data[0]);
    if(data[2] != -1) {
        $("#player2Name").html(data[1]);
    }

    // show inRoom
    $("#loginForm").hide();
    $("#roomList").hide(1000);
    $("#inRoom").show(500);
});

// update room list
socket.on("13-SERVER_UPDATE_ROOMS_LIST", function(data){
    for(let i = 0; i < data.length; i++) {
        let roomId = "#room" + i;
        let roomSpanId = "#roomSpan" + i;
        $(roomId).data("number-player", data[i]);
        $(roomSpanId).html(data[i]);
    }
});

// someone ready
socket.on("21-SERVER_READY", function(data){
    $(data).show();
});

socket.on("21-SERVER_READY_2", function(){
    $("#readyButton").val("Unready");
});

// someone unready
socket.on("21-SERVER_UNREADY", function(data){
    $(data).hide(100);
});

socket.on("21-SERVER_UNREADY_2", function(){
    $("#readyButton").val("Ready");
});

// game start
socket.on("22-SERVER_GAME_START", function(){
    $("#1Ready").hide();
    $("#2Ready").hide();
    $("#readyButton").hide();
    $("#chessboard").show(500);
})

socket.on("61-LEAVE-ROOM-SUCCESSFULLY", function(){
    alert("Leave room successfully!");
    $("#loginForm").hide();
    $("#inRoom").hide(1000);
    $("#roomList").show(500);
});

socket.on("71-SERVER_LOG_OUT_SUCCESSFULLY", function(){
    alert("Log out successfully!");
    $("#roomList").hide(1000);
    $("#loginForm").show(500);
    $("#inRoom").hide();
});

$(document).ready(function(){
    $("#loginForm").show();
    $("#roomList").hide();
    $("#inRoom").hide();

    // login
    $("#loginButton").click(function(){
        // send account and password to server
        let account = $("#account").val();
        let password = $("#password").val();
        socket.emit("00-CLIENT_LOGIN", {account:account, password:password});
    });

    // choose room
    $(".room").click(function(){
        if($(this).data("number-player") < 2) {
            // can access this room
            socket.emit("10-CLIENT_ROOM_ID", $(this).data("room"));
            currentRoom = $(this).data("room");
        } else {
            alert("This room is full!");
        }
    });

    $("#leaveRoomButton").click(function(){
        if(confirm("Do you want to leave room?")){
            socket.emit("60-CLIENT_LEAVE_ROOM", currentRoom);
            currentRoom = -1;
        };
    });

    $("#logoutButton").click(function(){
        if(confirm("Do you want to log out?")) {
            socket.emit("70-CLIENT_LOG_OUT");
        }
    });

    $("#readyButton").click(function(){
        socket.emit("20-USER_READY", currentRoom);
    });
});

