const { Socket } = require("dgram");
var express = require("express");
var app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");

var server = require("http").Server(app);
var io = require("socket.io")(server);

const accountList = ['admin1', 'admin2', 'admin3', 'admin4', 'admin5'];
const passwordList = ['123123', '123123', '123123', '123123', '123123'];
let accountStatus = [0, 0, 0, 0, 0];
let roomList = [0, 0, 0, 0, 0];
let roomStatus = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
let clientInRoom = [[-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1]];

server.listen(3000);

io.on("connection", function(socket){
    console.log(socket.id + " connected.");
    console.log(socket.adapter.rooms);

    socket.clientName = "";

    // receive account and password from client
    socket.on("00-CLIENT_LOGIN", function(data){
        if(accountList.indexOf(data.account) >= 0) {
            // have account in accountList
            if(data.password == passwordList[accountList.indexOf(data.account)]) {
                // right password
                if(accountStatus[accountList.indexOf(data.account)] == 0) {
                    socket.clientName = data.account;
                    socket.emit("01-SERVER_ROOMS_LIST", roomList);
                    accountStatus[accountList.indexOf(data.account)] = 1;
                    console.log("accountStatus[]: " + accountStatus);
                } else {
                    // this account is using by another one
                    socket.emit("02-SERVER_LOGIN_INCORRECT");
                }
            } else {
                // wrong password
                socket.emit("02-SERVER_LOGIN_INCORRECT");
            }
        } else {
            // wrong account
            socket.emit("02-SERVER_LOGIN_INCORRECT");
        }
    });

    // receive room client want to access
    socket.on("10-CLIENT_ROOM_ID", function(data){ // data is currentRoom
        // create room name data
        socket.join(data);
        roomStatus[data][0] = 0;
        roomStatus[data][1] = 0;
        if(roomList[data] == 0) {
            clientInRoom[data][0] = socket.clientName;
        } else if (roomList[data] == 1) {
            if(clientInRoom[data][0] == -1) {
                clientInRoom[data][0] = socket.clientName;
            } else if(clientInRoom[data][1] == -1) {
                clientInRoom[data][1] = socket.clientName;
            }
        }
        console.log("clientInRoom[]: " + clientInRoom);
        // send list of players in room
        io.sockets.in(data).emit("11-SERVER_PLAYERS_IN_ROOM", clientInRoom[data])

        // update room list for every one
        if(roomList[data] < 2){
            roomList[data] += 1;
        }
        io.sockets.emit("13-SERVER_UPDATE_ROOMS_LIST", roomList);
    });

    // receive that user click ready button
    socket.on("20-USER_READY", function(data){
        if(clientInRoom[data][0] == socket.clientName){
            if(roomStatus[data][0] == 0){
                roomStatus[data][0] = 1;
                if(roomStatus[data][1] == 1){
                    io.sockets.in(data).emit("22-SERVER_GAME_START", clientInRoom[data][0]);    
                } else {
                    io.sockets.in(data).emit("21-SERVER_READY", "#1Ready");
                    socket.emit("21-SERVER_READY_2");
                }
            } else if(roomStatus[data][0] == 1){
                roomStatus[data][0] = 0;
                io.sockets.in(data).emit("21-SERVER_UNREADY", "#1Ready");
                socket.emit("21-SERVER_UNREADY_2");
            }
        } else if(clientInRoom[data][1] == socket.clientName){
            if(roomStatus[data][1] == 0){
                roomStatus[data][1] = 1;
                if(roomStatus[data][0] == 1){
                    io.sockets.in(data).emit("22-SERVER_GAME_START", clientInRoom[data][0]);    
                } else {
                    io.sockets.in(data).emit("21-SERVER_READY", "#2Ready");
                    socket.emit("21-SERVER_READY_2");
                }
            } else if(roomStatus[data][1] == 1){
                roomStatus[data][1] = 0;
                io.sockets.in(data).emit("21-SERVER_UNREADY", "#2Ready");
                socket.emit("21-SERVER_UNREADY_2");
            }
        }
    });

    // receive that client click on chessboard
    socket.on("30-PLACE", function(data){
        io.sockets.in(data.currentRoom).emit("31-BOARD_STATE", data);
    });

    // receive that client pass
    socket.on("40-PASS", function(data){ // data is currentRoom
        io.sockets.in(data).emit("41-BOARD_STATE");
    });

    socket.on("42-CLIENT_END_GAME", function(data){ // data is currentRoom
        roomStatus[data][0] = 0;
        roomStatus[data][1] = 0;
        io.sockets.in(data).emit("43-SERVER_END_GAME");
    });

    // receive that client want to leave room
    socket.on("60-CLIENT_LEAVE_ROOM", function(data){ // data is currentRoom
        socket.leave(data);

        // update roomList & clientInRoom
        roomList[data] -= 1;
        roomStatus[data][0] = 0;
        roomStatus[data][1] = 0;
        if(clientInRoom[data][0] == socket.clientName) {
            clientInRoom[data][0] = -1;
        } else if (clientInRoom[data][1] == socket.clientName) {
            clientInRoom[data][1] = -1;
        }

        // update room list for every one
        io.sockets.emit("13-SERVER_UPDATE_ROOMS_LIST", roomList);

        // send to player2 in room that player1 leaved this room
        io.sockets.in(data).emit("11-SERVER_PLAYERS_IN_ROOM", clientInRoom[data]);
        
        socket.emit("61-LEAVE-ROOM-SUCCESSFULLY");
    });

    // receive that client want to log out
    socket.on("70-CLIENT_LOG_OUT", function(){        
        accountStatus[accountList.indexOf(socket.clientName)] = 0;
        socket.clientName = "";
        socket.emit("71-SERVER_LOG_OUT_SUCCESSFULLY");
        console.log("accountStatus[]: " + accountStatus);
    })

    socket.on("disconnect", function(){
        // update roomList & clientInRoom
        for(let i = 0; i < 5; i++) {
            if(clientInRoom[i][0] == socket.clientName) {
                clientInRoom[i][0] = -1;
                roomList[i] -= 1;
                break;
            } else if (clientInRoom[i][1] == socket.clientName) {
                clientInRoom[i][1] = -1;
                roomList[i] -= 1;
                break;
            }    
        }
        
        accountStatus[accountList.indexOf(socket.clientName)] = 0;
        socket.clientName = "";
        console.log(socket.id + " disconnected.");
    });
});

app.get("/", function(req, res){
    res.render("home");
});