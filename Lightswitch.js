/*
 * Joppy Furr, 2015
 *
 * This is a work-in-progress tool for controlling LED lightbulbs
 * via a network bridge that accepts UDP packets as commands.
 */

/* Bridge configuration */
var fluffylight = {
    hostname: "Fluffylight.joppyfurr.lc",
    port: 8899
};

/* Room configuration */
var Room = {};
Room["Bedroom"] = { bridge: fluffylight, model: "rgbw",  group: [3] };
Room["Lamps"]   = { bridge: fluffylight, model: "rgb",   group: [0] };
Room["Hallway"] = { bridge: fluffylight, model: "white", group: [1] };
Room["Kitchen"] = { bridge: fluffylight, model: "white", group: [2] };
Room["Lounge" ] = { bridge: fluffylight, model: "rgbw",  group: [1, 2] };
Room["Desk" ] = { bridge: fluffylight, model: "rgbw",  group: [4] };

/* Command sets for various LED bulb models */
var Command = {};
Command["white"] = [
    /*   All   */ { On: 0x35, Off: 0x39, Brighter: 0x3c, Dimmer: 0x34, Warmer: 0x3e, Cooler: 0x3f,
                    Max: [ 0x35, 0xb5 ], Nightlight: [ 0x39, 0xb9 ] },
    /* Group 1 */ { On: 0x38, Off: 0x3b, Max: [ 0x38, 0xb8 ], Nightlight: [ 0x3b, 0xbb ] },
    /* Group 2 */ { On: 0x3d, Off: 0x33, Max: [ 0x3d, 0xbd ], Nightlight: [ 0x33, 0xb3 ] },
    /* Group 3 */ { On: 0x37, Off: 0x3a, Max: [ 0x37, 0xb7 ], Nightlight: [ 0x3a, 0xba ] },
    /* Group 4 */ { On: 0x32, Off: 0x36, Max: [ 0x32, 0xb2 ], Nightlight: [ 0x36, 0xb6 ] }
    ];
Command["rgb"] = [
    /*   All   */ { On: 0x22, Off: 0x21, Brighter: 0x23, Dimmer: 0x24, Faster: 0x25, Slower: 0x26,
                    Next:0x27, Previous: 0x28, Colour:0x20 }
    ];
Command["rgbw"] = [
    /*   All   */ { On: 0x42, Off: 0x41, Faster: 0x44, Slower: 0x43, Next: 0x4d, Colour: 0x40,
                    Brightness: 0x4e, White: [ 0x42, 0xc2 ] },
    /* Group 1 */ { On: 0x45, Off: 0x46, White: [ 0x45, 0xc5 ] },
    /* Group 2 */ { On: 0x47, Off: 0x48, White: [ 0x47, 0xc7 ] },
    /* Group 3 */ { On: 0x49, Off: 0x4a, White: [ 0x49, 0xc9 ] },
    /* Group 4 */ { On: 0x4b, Off: 0x4c, White: [ 0x4b, 0xcb ] }
    ];

var dgram = require ("dgram");
var udp_socket = dgram.createSocket("udp4");

function send_command (bridge, command, param) {
    var message = new Buffer (3);
    message[0] = command; message[1] = param; message[2] = 0x55;
    udp_socket.send (message, 0, 3, bridge.port, bridge.hostname);
}

function execute (room, command, param) {
    var command_count = 0;
    var delay = 100; /* The bridge requires a delay between commands */

    /* Special case for brightnes */
    if (command == "Brightness")
    {
        /* The brightness parameter should be mapped from 2 -> 27 */
        param = Math.round(2 + param / 256 * 25);
        param = Math.min (param, 0xff);
        param = Math.max (param, 0x00);
    }

    for (var i = 0; i < room.group.length; i++) {

        var model_commands = Command[room.model][0];
        var group_commands = Command[room.model][room.group[i]];

        /* Case 1: Two-packet commands */
        if (Array.isArray(group_commands[command])) {

            /* Send the first part */
            setTimeout (send_command, delay * command_count, room.bridge,
                        group_commands[command][0], 0x00);
            command_count += 1;

            /* Send the second part */
            setTimeout (send_command, delay * command_count, room.bridge,
                        group_commands[command][1], 0x00);
            command_count += 1;
        }
        /* Case 2: Commands that affect the group most recently turned on */
        else if (model_commands.hasOwnProperty(command)
             && !group_commands.hasOwnProperty(command))
        {
            /* First send an 'On' for the wanted group */
            setTimeout (send_command, delay * command_count, room.bridge,
                        group_commands["On"], 0x00);
            command_count += 1;

            /* Then send the command without the group */
            setTimeout (send_command, delay * command_count, room.bridge,
                        model_commands[command], param);
            command_count += 1;
        }
        /* Case 3: Single-packet commands */
        else {
            setTimeout (send_command, delay * command_count, room.bridge,
                        group_commands[command], param);
            command_count += 1;
        }
    }
};

/* HTTP Server */
var express = require("express"),
    app = express(),
    port = process.env.PORT || 3000;

app.use (express.static ("Client", { "index": ["main.html"] } ));

/* API to retrieve the room list */
app.get ("/Lightswitch/List/", function onListenEvent (req, res) {
    var roomlist = [];
    for (var room in Room) {
        roomlist.push ( { name:room, model:Room[room].model } );
    }
    res.send (roomlist);
});

/* API to control the bulbs */
app.post ("/Lightswitch/:room/:command/:param?", function (req, res) {

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

    /* Handle the optional parameter */
    var param = 0x00;
    if (req.params.param)
    {
        param = Math.round(req.params.param);
        param = Math.min (param, 0xff);
        param = Math.max (param, 0x00);
    }

    /* Respond to the request and kick-off the execution */
    res.send( { Result: "Ack" } );
    execute (room, command, param);
});

var server = app.listen (port, function() {
    console.log ("Listening on port %s.", server.address().port);
});
