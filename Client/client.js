(function () {
    var app = angular.module ("Lightswitch", []);

    app.controller ("LightswitchController", function ($scope, $http) {
        $http.get ("/Lightswitch/List/").
            then (function (res) { $scope.roomlist = res.data; },
                  function (res) { alert ( "Unable to retrieve room list" ); } );

        this.select_room = function(room) {
            this.active_room = room;
        };

        this.send_command = function(command, event) {
            if (arguments.length == 2)
            {
                var param = (event.clientX - event.target.offsetLeft) * 256 / event.target.clientWidth;
                command = command + "/" + param;
            }

            $http.post ("/Lightswitch/" + this.active_room.name + "/" + command).
                then (function (res) { if (res.data.Result != "Ack") { alert (res.data.Result) } },
                      function (res) { alert ( "AJAX Failure" ); });
        };
    });
})();
