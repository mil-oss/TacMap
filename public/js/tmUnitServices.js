/* global TacMapUnit */
// ***** UNIT SERVICES ******//
TacMapUnit.factory('GeoUnitService', function () {
    var geosvc = {
    };
    geosvc.entities = [];
    geosvc.polygons = [];
    geosvc.missionid = null;
    geosvc.sdatasources = [];
    geosvc.initGeodesy = function (missionid, missiondata) {
        console.log("initGeodesy " + missionid);
        geosvc.missionid = missionid;
        geosvc.sdatasources[geosvc.missionid] = new Cesium.CustomDataSource(geosvc.missionid);
        viewer.dataSources.add(geosvc.sdatasources[geosvc.missionid]);
        //console.log(missiondata);
        geosvc.entities = missiondata.Mission.Entities.Entity;
        geosvc.polygons = missiondata.Mission.Polygons.Polygon;
        geosvc.addPolygons(geosvc.polygons);
        geosvc.addEntities(geosvc.entities);
        //console.log(geosvc.movementsegments);
        viewer.zoomTo(geosvc.sdatasources[geosvc.missionid].entities.getById("Default"));
        geosvc.setNetViz(geosvc.entities, "");
    };
    geosvc.addPolygons = function (polygons) {
        for (i = 0; i < polygons.length; i++) {
            geosvc.addCesiumPolygon(polygons[i]);
        }
    };
    geosvc.addEntities = function (entities) {
        for (i = 0; i < entities.length; i++) {
            geosvc.entities[entities[i]._id] = entities[i];
            geosvc.addCesiumBillBoard(entities[i]);
        }
    };
    geosvc.addCesiumPolygon = function (poly) {
        var loc = poly._locations;
        loc = loc.replace(/\s|\"|\[|\]/g, "").split(",");
        //Cartesian wants long, lat
        geosvc.sdatasources[geosvc.missionid].entities.add({
            id: poly._id,
            name: poly._name,
            polygon: {
                hierarchy: Cesium.Cartesian3.fromDegreesArray(loc.reverse()),
                outline: true,
                outlineColor: Cesium.Color[poly._color],
                outlineWidth: 2,
                fill: false
            }
        });
    };
    geosvc.addCesiumBillBoard = function (entity) {
        var loc = entity._location;
        loc = loc.replace(/\s|\"|\[|\]/g, "").split(",");
        geosvc.sdatasources[geosvc.missionid].entities.add({
            id: entity._id,
            name: entity._name,
            position: Cesium.Cartesian3.fromDegrees(loc[1], loc[0]),
            billboard: {
                image: entity._icon,
                width: 40,
                height: 25
            },
            label: {
                text: entity._name,
                font: '10pt monospace',
                outlineWidth: 2,
                verticalOrigin: Cesium.VerticalOrigin.TOP,
                pixelOffset: new Cesium.Cartesian2(0, 15)
            }
        });
    };
    geosvc.setNetViz = function (e, netsel) {
        geosvc.entities = e;
        for (i = 0; i < e.length; i++) {
            if (netsel[e[i]._network] && geosvc.sdatasources[geosvc.missionid].entities.getById(e[i]._id)) {
                if (netsel[e[i]._network].show) {
                    geosvc.sdatasources[geosvc.missionid].entities.getById(e[i]._id).show = true;
                } else {
                    geosvc.sdatasources[geosvc.missionid].entities.getById(e[i]._id).show = false;
                }
            } else if (geosvc.sdatasources[geosvc.missionid].entities.getById(e[i]._id)) {
                geosvc.sdatasources[geosvc.missionid].entities.getById(e[i]._id).show = false;
            }
        }
    };
    geosvc.joinNetworks = function (entities, networks, msgsvc, $scope) {
        for (e = 0; e < entities.length; e++) {
            if ($scope.netselected[entities[e]._network]) {
                $scope.netselected[entities[e]._network].show === true;
                $scope.netselected[entities[e]._network].network = entities[e]._network;
                geosvc.setNetViz(entities, $scope.netselected);
            } else {
                $scope.netselected[entities[e]._network] = [];
                $scope.netselected[entities[e]._network].show = true;
                $scope.netselected[entities[e]._network].network = entities[e]._network;
                geosvc.setNetViz(entities, $scope.netselected);
            }
        }
        for (n = 0; n < networks.length; n++) {
            msgsvc.joinNet(networks[n]._name);
        }
    };
    return geosvc;
});
TacMapUnit.factory('MsgUnitService', function () {
    var msgsvc = {
    };
    msgsvc.unitid;
    msgsvc.missionid;
    msgsvc.connected = false;
    msgsvc.sending = false;
    msgsvc.lastSendingTime = 0;
    msgsvc.messagelist = [];
    msgsvc.socket = io();
    // Sends a message
    msgsvc.joinNet = function (netname) {
        if (!msgsvc.messagelist[netname]) {
            msgsvc.messagelist[netname] = [];
        }
        msgsvc.socket.emit('unit join', {unitid: msgsvc.unitid, netname: netname});
    };
    msgsvc.leaveNet = function (netname) {
        msgsvc.socket.emit('unit leave', {unitid: msgsvc.unitid, netname: netname});
    };
    return msgsvc;
});
TacMapUnit.factory('DlgBx', function ($window, $q) {
    var dlg = {
    };
    dlg.alert = function alert(message) {
        var defer = $q.defer();
        $window.alert(message);
        defer.resolve();
        return (defer.promise);
    };
    dlg.prompt = function prompt(message, defaultValue) {
        var defer = $q.defer();
        // The native prompt will return null or a string.
        var response = $window.prompt(message, defaultValue);
        if (response === null) {
            defer.reject();
        } else {
            defer.resolve(response);
        }
        return (defer.promise);
    };
    dlg.confirm = function confirm(message) {
        var defer = $q.defer();
        // The native confirm will return a boolean.
        if ($window.confirm(message)) {
            defer.resolve(true);
        } else {
            defer.reject(false);
        }
        return (defer.promise);
    };
    return dlg;
});