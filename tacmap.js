/* 
 * Copyright (C) 2015 jdn
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
var express = require('express');
var compression = require('compression');
var url = require('url');
var request = require('request');
var bodyParser = require('body-parser');
var fs = require('fs');
var cesium = require('./geoserver/cesiumserver');
//
var http = require('http');

var app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.use(compression());

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/server', function (req, res) {
    res.sendFile(__dirname + '/public/server.html');
});

app.get('/unit', function (req, res) {
    res.sendFile(__dirname + '/public/unit.html');
});

app.get('/json/*', function (req, res) {
    res.sendFile(__dirname + '/public' + req.url);
});

app.post('/json/*', function (req, res) {
    //console.log(request.body);
    fs.writeFile(__dirname + '/public' + req.url, JSON.stringify(req.body), function () {
        res.end();
    });
});

app.put('/json/*', function (req, res) {
    //console.log(req.body);
    fs.writeFile(__dirname + '/public' + req.url, JSON.stringify(req.body), function () {
        res.end();
    });
});

app.put('/xml/*', function (req, res) {
    console.log("Put " + req.url);
    console.log(req.body);
    fs.writeFile(__dirname + '/public' + req.url, req.body, function () {
        res.end();
    });
});

app.post('/entity/*'),function(req,res){
    console.log("Post entity " + req.url);
    console.log(req.body);
    fs.writeFile(__dirname + '/public' + req.url, req.body, function () {
        res.end();
    });
}

var server = http.createServer(app);
var io = require('socket.io').listen(server);
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8000
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'
server.listen(server_port, server_ip_address, function () {
    console.log('listening on ' + server_port);
});
//
var missionid = "Default Mission";
var missiondata = [];
var servers = [];
var units = [];
var allconnections = [];
var missionRunning = false;

io.on('connection', function (socket) {

    allconnections.push(socket);

    socket.on('disconnect', function () {
        var i = allconnections.indexOf(socket);
        console.log(i.id + " disconnected");
        delete allconnections[i];
    });
    // Use socket to communicate with this particular unit only, sending it it's own id
    socket.emit('connection', {message: 'Msg Socket Ready', socketid: socket.id});

    socket.on('server connected', function (data) {
        console.log("server connect to socket: " + data.socketid + ", mission:" + data.missionid);
        servers.push({server: data.socketid});
        if (missionid === "Default Mission") {
            missiondata = data.missiondata;
            io.emit('init server', {target: "server", missionid: data.missionid, missiondata: missiondata});
        } else {
            io.emit('init server', {target: "server", missionid: missionid, missiondata: missiondata});
        }
        if (missionRunning) {
            io.emit('start mission');
        }
    });
    socket.on('unit connected', function (data) {
        console.log("units connect: " + data.id + " set mission: " + missionid);
        units.push({unit: data.id});
        io.emit('unit connected', {missionid: missionid, missiondata: missiondata});
    });
    socket.on('send msg', function (data) {
        console.log('send msg from ' + data.message.unit + ' to ' + data.net);
        socket.to(data.net).emit('msg sent', data);
    });
    socket.on('unit join', function (data) {
        //console.log(data.unitid + ' joined ' + data.netname);
        socket.join(data.netname);
        io.emit('unit joined', {unitid: data.unitid, netname: data.netname});
    });
    socket.on('server join', function (data) {
        //console.log(data.serverid + ' joined ' + data.netname);
        socket.join(data.netname);
        io.emit('server joined', {serverid: data.serverid, netname: data.netname});
    });
    socket.on('server leave', function (data) {
        // console.log(data.serverid + ' left ' + data.netname);
        socket.leave(data.netname);
        io.emit('server left', {serverid: data.serverid, netname: data.netname});
    });
    socket.on('unit leave', function (data) {
        //console.log(data.unitid + ' left ' + data.netname);
        socket.leave(data.netname);
        io.emit('unit left', {unitid: data.unitid, netname: data.netname});
    });
    socket.on('add entity', function (data) {
        console.log("emit add entity: " + data._id);
        io.emit('add entity', data);
    });
    socket.on('set mission', function (data) {
        console.log("set mission: " + data.missionid);
        missionid = data.missionid;
        missiondata = data.missiondata;
        io.emit('set mission', {target: "unit", missionid: missionid, missiondata: missiondata});
    });
    socket.on('mission running', function () {
        missionRunning = true;
        io.emit('start mission');
    });
    socket.on('mission stopped', function () {
        missionRunning = false;
        io.emit('stop mission');
    });
    socket.on('mission time', function (data) {
        io.emit('set time',data);
    });
});
