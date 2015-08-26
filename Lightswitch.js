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
var Command = {};
Command["white"] = [
    /*   All   */ { On: 0x35, Off: 0x39, Brighter: 0x3c, Dimmer: 0x34 },
    /* Group 1 */ { On: 0x38, Off: 0x3b },
    /* Group 2 */ { On: 0x3d, Off: 0x33 },
    /* Group 3 */ { On: 0x37, Off: 0x3a },
    /* Group 4 */ { On: 0x32, Off: 0x36 }
    ];
Command["rgb"] = [
    /*   All   */ { On: 0x22, Off: 0x21, Brighter: 0x23, Dimmer: 0x24 }
    ];
Command["rgbw"] = [
    /*   All   */ { On: 0x42, Off: 0x41 },
    /* Group 1 */ { On: 0x45, Off: 0x46 },
    /* Group 2 */ { On: 0x47, Off: 0x48 },
    /* Group 3 */ { On: 0x49, Off: 0x4a },
    /* Group 4 */ { On: 0x4b, Off: 0x4c }
    ];

var dgram = require ("dgram");
var udp_socket = dgram.createSocket("udp4");

function send_command (bridge, command) {
    var message = new Buffer (3);
    message[0] = command; message[1] = 0x00; message[2] = 0x55;
    udp_socket.send (message, 0, 3, bridge.port, bridge.hostname);
}

function execute (room, command) {
    var command_count = 0;
    var delay = 100; /* The bridge requires a delay between commands */

    for (var i = 0; i < room.group.length; i++) {

        /* Do we first need to send an 'On' signal to select the bulb? */
        if (   (!(Command[room.model][room.group[i]].hasOwnProperty(command)))
            && (Command[room.model][0].hasOwnProperty(command)))
        {
            /* First send an 'On' for the wanted group */
            setTimeout (send_command, delay * command_count, room.bridge,
                        Command[room.model][room.group[i]]["On"]);
            command_count += 1;

            /* Then send the command without the group */
            setTimeout (send_command, delay * command_count, room.bridge,
                        Command[room.model][0][command]);
            command_count += 1;
        }
        /* Simple command */
        else {
            setTimeout (send_command, delay * command_count, room.bridge,
                        Command[room.model][room.group[i]][command]);
            command_count += 1;
        }
    }
};

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

    /* Check the room */
    if (!(req.params.room in Room)) {
        res.send ( { Result: "No such room" } );
        return;
    }
    var room = Room[req.params.room];

    /* Check the command */
    if (!Command[room.model][0].hasOwnProperty(req.params.command)) {
        res.send ( { Result: "No such command" } );
        return;
    }
    var command = req.params.command;

    res.send( { Result: "Ack" } );
    execute (room, command);
});

var server = app.listen (port, function() {
    console.log ("Listening on port %s.", server.address().port);
});
