/*
 * Joppy Furr, 2015
 *
 * This is a work-in-progress tool for controlling LED lightbulbs
 * via a network bridge that accepts UDP packets as commands.
 */
/* Bridge configuration */
var fluffylight = {
    hostname: "Fluffylight",
    port: 50000
};

/* Room configuration */
var Room = {};
Room["Bedroom"] = { bridge: fluffylight, model: "rgb",   group: [0] };
Room["Hallway"] = { bridge: fluffylight, model: "white", group: [1] };
Room["Kitchen"] = { bridge: fluffylight, model: "white", group: [2] };
Room["Lounge" ] = { bridge: fluffylight, model: "rgbw",  group: [1, 2] };

/* Command sets for various LED bulb models */
var Model = {};
Model["white"] = [
    /*   All   */ { on: 0x35, off:0x39 },
    /* Group 1 */ { on: 0x38, off:0x3b },
    /* Group 2 */ { on: 0x3d, off:0x33 },
    /* Group 3 */ { on: 0x37, off:0x3a },
    /* Group 4 */ { on: 0x32, off:0x36 }
    ];
Model["rgb"] = [
    /*   All   */ { on: 0x22, off:0x21 }
    ];
Model["rgbw"] = [
    /*   All   */ { on: 0x42, off:0x41 },
    /* Group 1 */ { on: 0x45, off:0x46 },
    /* Group 2 */ { on: 0x47, off:0x48 },
    /* Group 3 */ { on: 0x49, off:0x4a },
    /* Group 4 */ { on: 0x4b, off:0x4c }
    ];

/* Command execution */
var dgram = require ("dgram");
var udp_socket = dgram.createSocket("udp4");

function Execute (bridge, command) {
    var message = new Buffer (3);
    message[0] = command; message[1] = 0x00; message[2] = 0x55;
    udp_socket.send (message, 0, 3, bridge.port, bridge.hostname);
}

var Command = {};
Command["On"]  = function (model, group) { return Model[model][group].on;  };
Command["Off"] = function (model, group) { return Model[model][group].off; };

/* Web stuff */
var express = require("express"),
    app = express(),
    port = process.env.PORT || 3000;

app.use (express.static ("Client", { "index": ["main.html"] } ));

app.get ("/Lightswitch/List/", function onListenEvent (req, res) {
    var roomlist = [];
    for (var room in Room) {
        roomlist.push ( { name:room, model:Room[room].model } );
    }
    res.send (roomlist);
});

app.put ("/Lightswitch/:room/:command", function (req, res) {
    if (!(req.params.room in Room)) {
        res.send ( { Result: "No such room" } );
    }
    else if (!(req.params.command in Command)) {
        res.send ( { Result: "No such command" } );
    }
    else {
        var room = Room[req.params.room];
        var command = req.params.command;
        res.send( { Result: "Ack" } );

        for (var i = 0; i < room.group.length; i++) {
            var delay = i * 100; /* The bridge requires a delay between commands */
            setTimeout ( Execute, delay, room.bridge, Command[command] (room.model, room.group[i]));
        }
    }
});

var server = app.listen (port, function() {
    console.log ("Listening on port %s.", server.address().port);
});
