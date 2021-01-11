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
let roomReadyStatus = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
let clientInRoom = [[-1, -1], [-1, -1], [-1, -1], [-1, -1], [-1, -1]];
let inGameList = [false, false, false, false, false];

server.listen(3000);

io.on("connection", function(socket){
    socket.clientName = "";

    // receive account and password from client
    socket.on("00_CLIENT_LOGIN", function(data){
        if(accountList.indexOf(data.account) >= 0) {
            // have account in accountList
            if(data.password == passwordList[accountList.indexOf(data.account)]) {
                // right password
                if(accountStatus[accountList.indexOf(data.account)] == 0) {
                    socket.clientName = data.account;
                    socket.emit("01_SERVER_ROOMS_LIST", roomList);
                    accountStatus[accountList.indexOf(data.account)] = 1;
                } else {
                    // this account is using by another one
                    socket.emit("02_SERVER_LOGIN_INCORRECT");
                }
            } else {
                // wrong password
                socket.emit("02_SERVER_LOGIN_INCORRECT");
            }
        } else {
            // wrong account
            socket.emit("02_SERVER_LOGIN_INCORRECT");
        }
    });

    // receive room client want to access
    socket.on("10_CLIENT_ROOM_ID", function(currentRoom){
        // create room name currentRoom
        socket.join(currentRoom);
        unreadyClientInRoom(currentRoom);
        if(roomList[currentRoom] == 0) {
            clientInRoom[currentRoom][0] = socket.clientName;
        } else if (roomList[currentRoom] == 1) {
            if(clientInRoom[currentRoom][0] == -1) {
                clientInRoom[currentRoom][0] = socket.clientName;
            } else if(clientInRoom[currentRoom][1] == -1) {
                clientInRoom[currentRoom][1] = socket.clientName;
            }
        }
        socket.currentRoom = currentRoom;

        // send list of players in room
        io.sockets.in(currentRoom).emit("11_SERVER_PLAYERS_IN_ROOM", clientInRoom[currentRoom])

        // update room list for every one
        if(roomList[currentRoom] < 2){
            roomList[currentRoom] += 1;
        }
        io.sockets.emit("13_SERVER_UPDATE_ROOMS_LIST", roomList);
    });

    // receive that user click ready button
    socket.on("20_USER_READY", function(currentRoom){
        if(clientInRoom[currentRoom][0] == socket.clientName){
            if(roomReadyStatus[currentRoom][0] == 0){
                roomReadyStatus[currentRoom][0] = 1;
                if(roomReadyStatus[currentRoom][1] == 1){
                    inGameList[currentRoom] = true;
                    io.sockets.in(currentRoom).emit("22_SERVER_GAME_START", clientInRoom[currentRoom][0]);    
                } else {
                    io.sockets.in(currentRoom).emit("21_SERVER_READY", "#1Ready");
                    socket.emit("21_SERVER_READY_2");
                }
            } else if(roomReadyStatus[currentRoom][0] == 1){
                roomReadyStatus[currentRoom][0] = 0;
                io.sockets.in(currentRoom).emit("21_SERVER_UNREADY", "#1Ready");
                socket.emit("21_SERVER_UNREADY_2");
            }
        } else if(clientInRoom[currentRoom][1] == socket.clientName){
            if(roomReadyStatus[currentRoom][1] == 0){
                roomReadyStatus[currentRoom][1] = 1;
                if(roomReadyStatus[currentRoom][0] == 1){
                    inGameList[currentRoom] = true;
                    io.sockets.in(currentRoom).emit("22_SERVER_GAME_START", clientInRoom[currentRoom][0]);    
                } else {
                    io.sockets.in(currentRoom).emit("21_SERVER_READY", "#2Ready");
                    socket.emit("21_SERVER_READY_2");
                }
            } else if(roomReadyStatus[currentRoom][1] == 1){
                roomReadyStatus[currentRoom][1] = 0;
                io.sockets.in(currentRoom).emit("21_SERVER_UNREADY", "#2Ready");
                socket.emit("21_SERVER_UNREADY_2");
            }
        }
    });

    // receive that client click on chessboard
    socket.on("30_PLACE", function(data){
        io.sockets.in(data.currentRoom).emit("31_BOARD_STATE", data);
    });

    // receive that client pass
    socket.on("40_PASS", function(currentRoom){
        io.sockets.in(currentRoom).emit("41_BOARD_STATE");
    });

    socket.on("42_CLIENT_END_GAME", function(currentRoom){
        if(inGameList[currentRoom]) {
            unreadyClientInRoom(currentRoom);
            io.sockets.in(currentRoom).emit("43_SERVER_END_GAME");
            inGameList[currentRoom] = false;
        }
    });
    socket.on("44_CLIENT_TIME_END_GAME", function(currentRoom){
        if(inGameList[currentRoom]) {
            unreadyClientInRoom(currentRoom);
            io.sockets.in(currentRoom).emit("45_SERVER_TIME_END_GAME");
            inGameList[currentRoom] = false;
        }
    });

    // receive that client want to leave room
    socket.on("60_CLIENT_LEAVE_ROOM", function(currentRoom){
        socket.leave(currentRoom);
        socket.currentRoom = -1;

        // update roomList & clientInRoom
        roomList[currentRoom] -= 1;
        unreadyClientInRoom(currentRoom);
        if(clientInRoom[currentRoom][0] == socket.clientName) {
            clientInRoom[currentRoom][0] = -1;
        } else if (clientInRoom[currentRoom][1] == socket.clientName) {
            clientInRoom[currentRoom][1] = -1;
        }

        // update room list for every one
        io.sockets.emit("13_SERVER_UPDATE_ROOMS_LIST", roomList);

        // send to player2 in room that player1 leaved this room
        io.sockets.in(currentRoom).emit("11_SERVER_PLAYERS_IN_ROOM", clientInRoom[currentRoom]);
        
        socket.emit("61_LEAVE-ROOM-SUCCESSFULLY");
    });

    // receive that client want to log out
    socket.on("70_CLIENT_LOG_OUT", function(){        
        socket.currentRoom = -1;
        accountStatus[accountList.indexOf(socket.clientName)] = 0;
        socket.clientName = "";
        socket.emit("71_SERVER_LOG_OUT_SUCCESSFULLY");
    })

    socket.on("disconnect", function(){
        // update roomList & clientInRoom
        for(let i = 0; i < 5; i++) {    // i is currentRoom
            if(clientInRoom[i][0] == socket.clientName || clientInRoom[i][1] == socket.clientName) {
                if(clientInRoom[i][0] == socket.clientName) {
                    clientInRoom[i][0] = -1;
                } else if (clientInRoom[i][1] == socket.clientName) {
                    clientInRoom[i][1] = -1;
                }
                unreadyClientInRoom(i);
                inGameList[i] = false;
                roomList[i] -= 1;
                // send to player2 in room that player1 leaved this room
                io.sockets.in(i).emit("11_SERVER_PLAYERS_IN_ROOM", clientInRoom[i]);
                break;
            }
        }
        
        accountStatus[accountList.indexOf(socket.clientName)] = 0;
        socket.clientName = "";

        // Update roomList to other clients
        io.sockets.emit("13_SERVER_UPDATE_ROOMS_LIST", roomList);
    });
});

app.get("/", function(req, res){
    res.render("home");
});

function unreadyClientInRoom(currentRoom) {
    roomReadyStatus[currentRoom][0] = 0;
    roomReadyStatus[currentRoom][1] = 0;
}