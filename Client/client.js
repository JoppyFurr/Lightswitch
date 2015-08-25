(function () {
    var app = angular.module ("Lightswitch", []);

    app.controller ("LightswitchController", function ($scope, $http) {
        this.rooms = rooms;
        this.active_room = rooms[0];

        this.selectRoom = function(room) {
            this.active_room = room;
        };

        this.roomOn = function() {
            $http.put ("http://ferret:3000/Lightswitch/" + this.active_room.name + "/On").
                then (function (res) { /* Success */ },
                      function (res) { alert ( "Failure" ) });
        };

        this.roomOff = function() {
            $http.put ("http://ferret:3000/Lightswitch/" + this.active_room.name + "/Off").
                then (function (res) { /* alert ( "Success" ) */ },
                      function (res) { alert ( "Failure" ) });
        };
    });

    rooms = [
    {
        name: "Bedroom",
        model: "rgb"
    },
    {
        name: "Kitchen",
        model: "white"
    },
    {
        name: "Lounge",
        model: "rgbw"
    },
    {
        name: "Hallway",
        model: "white"
    }
    ]

})();
