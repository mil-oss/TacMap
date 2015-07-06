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
/* global Cesium, angular, stctl */

var databasename = "tacmapDb";
var storestructure = [
    ['Resources', 'name', false, [['url', 'url', true], ['lastmod', 'lastmod', false], ['data', 'data', false]]],
    ['Scenario', 'name', false, [['data', 'data', false]]]
];
var resources = ['xml/defaultScenario.xml', 'json/files.json'];
var compression = false;
var viewer = new Cesium.Viewer('cesiumContainer', {
    animation: false,
    timeline: false,
    infoBox: true,
    selectionIndicator: true,
    baseLayerPicker: true,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    imageryProvider: new Cesium.ArcGisMapServerImageryProvider({
        url: '//services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
    }),
//    imageryProvider: new Cesium.ArcGisMapServerImageryProvider({
//        url: '//services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
//    }), 
    /*imageryProvider: new Cesium.BingMapsImageryProvider({
     url: '//dev.virtualearth.net',
     key: 'get-yours-at-https://www.bingmapsportal.com/',
     mapStyle: Cesium.BingMapsStyle.AERIAL
     }),*/ 
    /*imageryProvider: new Cesium.GoogleEarthImageryProvider({
      url: '//earth.localdomain',
      channel: 1008
      }),*/
//    imageryProvider: new Cesium.TileMapServiceImageryProvider({
//        url: 'Cesium/Assets/Textures/NaturalEarthII'
//    }),
// OpenStreetMap tile provider
//    imageryProvider: new Cesium.OpenStreetMapImageryProvider({
//        url: '/tiles'
//    }),
    homeButton:false,
    geocoder: false
});
var scene = viewer.scene;
var xj = new X2JS();
var TacMapServer = angular.module('TacMapServer', ['indexedDB']);
TacMapServer.config(function ($indexedDBProvider) {
    $indexedDBProvider.connection(databasename).upgradeDatabase(1, function (event, db, tx) {
        console.log("initDb");
        for (i = 0; i < storestructure.length; i++) {
            //console.log("add store " + storestructure[i][0] + " key:" + storestructure[i][1] + " autoinc:" + storestructure[i][2]);
            var objectStore = db.createObjectStore(storestructure[i][0], {
                keyPath: storestructure[i][1], autoIncrement: storestructure[i][2]
            });
            var indices = storestructure[i][3];
            for (j = 0; j < indices.length; j++) {
                //console.log("add index " + indices[j][0] + " ref:" + indices[j][1] + " unique:" + indices[j][2]);
                objectStore.createIndex(indices[j][0], indices[j][1], {
                    unique: indices[j][2]
                });
            }
        }
    });
});
// ***** CONTROLLERS ******//
TacMapServer.controller('storeCtl', function ($indexedDB, $scope, $http, GeoService, MsgService, DlgBx) {
    var stctl = this;
    console.log("storeCtl");
    var dB = $indexedDB;
    var ellipsoid = scene.globe.ellipsoid;
    stctl.unitselected = null;
    stctl.unitselectedid = null;
    stctl.currscene = null;
    stctl.editchecked = false;
    stctl.editlocchecked = false;
    stctl.editrptchecked = false;
    stctl.rptto = [];
    stctl.import = false;
    stctl.files = [];
    //   
    stctl.entities = [];
    stctl.units = [];
    stctl.networks = [];
    stctl.scenario = [];
    stctl.scenelist = [];
    stctl.waypoints = [];
    stctl.loc = [];
    stctl.showWP = true;
    $scope.selscene = {id: 0, value: 'Default Scenario'};
    $scope.netselected = [];
    stctl.speedsel = [];
    //
    stctl.lftClickHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    stctl.lftClickHandler.setInputAction(function (mouse) {
        var pickedObject = scene.pick(mouse.position);
        if (Cesium.defined(pickedObject) && pickedObject.id.position !== undefined && pickedObject.id.billboard) {
            stctl.selectUnit(pickedObject.id);
        } else {
            stctl.loc = [];
            stctl.unitselected = null;
            $scope.$apply();
        }
    },
            Cesium.ScreenSpaceEventType.LEFT_CLICK);
    stctl.rtClickHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    stctl.rtClickHandler.setInputAction(function (mouse) {
        //console.log("edit: " + stctl.editchecked);
        //console.log("speed: " + $scope.speedsel._value);
        var cartesian = viewer.camera.pickEllipsoid(mouse.position, ellipsoid);
        if (stctl.editchecked && cartesian && stctl.unitselected !== null) {
            //console.log("unitselected: " + stctl.unitselected._id);
            var cartographic = ellipsoid.cartesianToCartographic(cartesian);
            stctl.addWaypoint(stctl.loc, Cesium.Math.toDegrees(cartographic.latitude), Cesium.Math.toDegrees(cartographic.longitude), stctl.speedsel._value);
        }
        if (stctl.editlocchecked && cartesian && stctl.unitselected !== null) {
            var cartographic = ellipsoid.cartesianToCartographic(cartesian);
            stctl.setLocation(stctl.unitselected, Cesium.Math.toDegrees(cartographic.latitude), Cesium.Math.toDegrees(cartographic.longitude));
        }
    },
            Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    //
    for (i = 0; i < resources.length; i++) {
        syncResource($http, $scope, resources[i], dB, stctl, GeoService);
    }
    stctl.selectUnit = function (u, zoomto) {
//console.log(u._id);
//console.log($scope.selscene.value);
        stctl.unitselected = GeoService.sdatasources[$scope.selscene.value].entities.getById(u._id);
        stctl.unitselectedid = stctl.unitselected._id;
        stctl.loc = stctl.getLoc(stctl.unitselected);
        if (zoomto) {
            GeoService.sdatasources[$scope.selscene.value].selectedEntity = stctl.unitselected;
            viewer.selectedEntity = stctl.unitselected;
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(stctl.loc[1], stctl.loc[0], 10000.0),
                duration: 1
            });
        } else {
            $scope.$apply();
        }
    };
    stctl.getLoc = function (entity) {
        var cartesian = entity.position.getValue();
        var cartographic = ellipsoid.cartesianToCartographic(cartesian);
        var latitudeString = Cesium.Math.toDegrees(cartographic.latitude);
        var longitudeString = Cesium.Math.toDegrees(cartographic.longitude);
        entity.description = "Location: " + latitudeString + ", " + longitudeString;
        return ([latitudeString, longitudeString]);
    };
    stctl.setLocation = function (entity, lat, lng) {
        GeoService.sdatasources[$scope.selscene.value].entities.getById(entity._id).position = Cesium.Cartesian3.fromDegrees(lng, lat);
        stctl.removeAllWp();
        stctl.updateDb(entity._id, '_location', lat + "," + lng);
        stctl.selectUnit(entity);
    };
    //
    stctl.addWaypoint = function (startpt, lat, lng, speed) {
        //console.log("Add Waypoint " + stctl.unitselected._id + " " + lat + " " + lng + " " + speed);
        if (GeoService.waypoints[stctl.unitselected._id]) {
            stctl.waypoints[stctl.unitselected._id] = GeoService.waypoints[stctl.unitselected._id];
        }
        if (!stctl.waypoints[stctl.unitselected._id]) {
            stctl.waypoints[stctl.unitselected._id] = [];
            stctl.waypoints[stctl.unitselected._id].push([startpt[0], startpt[1], speed]);
        }
        if (stctl.waypoints[stctl.unitselected._id].length === 0) {
            stctl.waypoints[stctl.unitselected._id].push([startpt[0], startpt[1], speed]);
        }
        stctl.waypoints[stctl.unitselected._id].push([lat, lng, speed]);
        GeoService.waypoints[stctl.unitselected._id] = stctl.waypoints[stctl.unitselected._id];
        var obj = stctl.waypoints[stctl.unitselected._id];
        var len = obj.length;
        //console.log("len: " + len);
        if (len > 1) {
            var arr = [obj[len - 2][1], obj[len - 2][0], obj[len - 1][1], obj[len - 1][0]];
            GeoService.wpdatasources[$scope.selscene.value].entities.add({
                id: stctl.unitselected._id + 'WP' + stctl.waypoints[stctl.unitselected._id].length,
                polyline: {
                    positions: Cesium.Cartesian3.fromDegreesArray(arr),
                    width: 1,
                    material: Cesium.Color.LIGHTYELLOW
                }
            });
            stctl.updateDb(stctl.unitselected._id, "waypoints", stctl.waypoints[stctl.unitselected._id]);
        }
    };
    stctl.removeLastWp = function () {
        stctl.waypoints[stctl.unitselected._id] = GeoService.waypoints[stctl.unitselected._id];
        if (stctl.waypoints[stctl.unitselected._id]) {
            if (stctl.unitselected && stctl.waypoints[stctl.unitselected._id].length > 1) {
                console.log("Remove Waypoint " + stctl.unitselected._id + 'WP' + stctl.waypoints[stctl.unitselected._id].length);
                GeoService.wpdatasources[$scope.selscene.value].entities.removeById(stctl.unitselected._id + 'WP' + stctl.waypoints[stctl.unitselected._id].length);
                stctl.waypoints[stctl.unitselected._id].splice(-1, 1);
                GeoService.waypoints[stctl.unitselected._id] = stctl.waypoints[stctl.unitselected._id];
                stctl.updateDb(stctl.unitselected._id, "waypoints", stctl.waypoints[stctl.unitselected._id]);
            }
        }
    };
    stctl.removeAllWp = function () {
        if (GeoService.waypoints[stctl.unitselected._id])
        {
            stctl.waypoints[stctl.unitselected._id] = GeoService.waypoints[stctl.unitselected._id];
        }
        if (stctl.waypoints[stctl.unitselected._id]) {
            var len = stctl.waypoints[stctl.unitselected._id].length;
            for (ln = len; ln > 0; ln--) {
                GeoService.wpdatasources[$scope.selscene.value].entities.removeById(stctl.unitselected._id + 'WP' + ln);
            }
        }
        stctl.waypoints[stctl.unitselected._id] = [];
        GeoService.waypoints[stctl.unitselected._id] = [];
        stctl.updateDb(stctl.unitselected._id, "waypoints", stctl.waypoints[stctl.unitselected._id]);
    };
    //
    stctl.saveScenario = function (currentscene) {
        console.log("saveScenario");
        DlgBx.prompt("Enter Save As Name or Overwrite", currentscene.value).then(function (newname) {
            var overwrite = null;
            var overwriteid = null;
            for (n = 0; n < stctl.scenelist.length; n++) {
                if (newname === stctl.scenelist[n].value) {
                    overwrite = stctl.scenelist[n].value;
                    overwriteid = stctl.scenelist[n].value;
                }
            }
            if (overwrite !== null) {
                DlgBx.confirm("This Action will Overwrite Scenario", overwrite).then(function (yes) {
                    if (yes) {
                        console.log("Save " + overwrite);
                        stctl.overwriteScenario(overwrite);
                        stctl.currscene = currentscene;
                        stctl.loadScenario({id: overwriteid, value: overwrite});
                    }
                });
            } else {
                console.log("Save " + newname);
                stctl.copyScenario($scope.selscene.value, newname);
                stctl.scenelist.push({
                    id: stctl.scenelist.length - 1, value: newname
                });
                stctl.currscene = currentscene;
                stctl.loadScenario(stctl.scenelist[stctl.scenelist.length - 1]);
            }
        });
    };
    stctl.loadScenario = function (nextscene) {
        console.log("loadScenario " + nextscene.value);
        //console.log("Current Scenario:" + stctl.currscene.value);
        $scope.netselected = [];
        viewer.dataSources.remove(GeoService.sdatasources[$scope.selscene.value]);
        viewer.dataSources.remove(GeoService.wpdatasources[$scope.selscene.value]);
        dB.openStore("Scenario", function (store) {
            store.find(nextscene.value).then(function (sc) {
                stctl.entities = sc.data.Scenario.Entities.Entity;
                stctl.networks = sc.data.Scenario.Networks.Network;
                GeoService.initGeodesy(nextscene.value, sc.data);
                stctl.currscene = nextscene;
                MsgService.setScenario(nextscene.value, sc.data);
                GeoService.joinNetworks(stctl.entities, stctl.networks, MsgService, $scope);
            });
        });
        $scope.selscene = nextscene;
    };
    stctl.hideWaypoints = function () {
        stctl.showWP = false;
        GeoService.hideAllWP();
    };
    stctl.showWaypoints = function () {
        console.log("showWaypoints");
        stctl.showWP = true;
        GeoService.showAllWP();
    };
    //
    stctl.clearDb = function () {
        console.log("Clear DB");
        DlgBx.confirm("Confirm Deletion of Local Data").then(function () {
            viewer.dataSources.remove(GeoService.sdatasources[$scope.selscene.value]);
            viewer.dataSources.remove(GeoService.wpdatasources[$scope.selscene.value]);
            dB.openStore('Resources', function (store) {
                store.clear();
            });
            dB.openStore('Scenario', function (store) {
                store.clear();
            });
        });
    };
    stctl.exportScenario = function () {
        console.log("exportScenario");
        DlgBx.prompt("Enter Export Save As Name:", $scope.selscene.value).then(function (newname) {
            if (newname === 'Default Scenario') {
                DlgBx.alert("You Can't' Overwrite the Default Scenario");
            } else {
                var overwrite = null;
                for (n = 0; n < stctl.files.length; n++) {
                    if (newname === stctl.files[n].scenario) {
                        overwrite = stctl.files[n].scenario;
                    }
                }
                if (overwrite !== null) {
                    DlgBx.confirm("This Action will Overwrite Scenario", overwrite).then(function (yes) {
                        if (yes) {
                            console.log("Export " + overwrite);
                            dB.openStore("Scenario", function (store) {
                                store.find(overwrite).then(function (scen) {
                                    var scenario = scen.data;
                                    //console.log(scenario);
                                    $http.put("/json/" + overwrite.replace(' ', '') + '.json', scenario);
                                });
                            });
                        }
                    });
                } else {
                    console.log("Export " + newname);
                    dB.openStore("Scenario", function (store) {
                        store.find($scope.selscene.value).then(function (scen) {
                            var scenario = scen.data;
                            $http.post("/json/" + newname.replace(' ', '') + '.json', scenario)
                                    .success(function () {
                                        console.log("Saved " + newname + " to /json/" + newname.replace(' ', '') + ".json");
                                        stctl.files.push({
                                            id: stctl.files.length - 1, scenario: newname, name: newname.replace(' ', '') + ".json", url: "/json/" + newname.replace(' ', '') + ".json"
                                        });
                                        dB.openStore('Resources', function (store) {
                                            store.upsert({
                                                name: "files.json", url: "/json/files.json", data: stctl.files
                                            }).then(function () {
                                                store.find("files.json").then(function (st) {
                                                    $http.put('/json/files.json', st.data);
                                                });
                                            });
                                        });
                                    });
                        });
                    });
                }
            }
            stctl.import = false;
        });
    };
    stctl.importScenario = function () {
        stctl.import = true;
    };
    stctl.getFile = function (savedscene) {
        console.log("Get File: " + savedscene.name + ", " + savedscene.url);
        $http.get(savedscene.url).success(function (sdata) {
            DlgBx.prompt("Enter Save As Name or Overwrite", savedscene.scenario).then(function (newname) {
                if (newname === "Default Scenario") {
                    DlgBx.alert("You Can't' Overwrite the Default Scenario");
                } else {
                    var overwrite = null;
                    var overwriteid = null;
                    for (i = 0; i < stctl.scenelist.length; i++) {
                        if (newname === stctl.scenelist[i].value) {
                            overwrite = stctl.scenelist[i].value;
                            console.log(overwrite);
                            overwriteid = stctl.scenelist[i].value;
                            break;
                        }
                    }
                    if (overwrite !== null) {
                        console.log(overwrite);
                        DlgBx.confirm("This Action will Overwrite Scenario " + overwrite).then(function (yes) {
                            if (yes) {
                                stctl.scenario = sdata;
                                stctl.overwriteScenario(overwrite);
                            }
                        });
                    } else {
                        console.log("Save " + newname);
                        stctl.scenario = sdata;
                        dB.openStore("Scenario", function (store) {
                            store.insert({name: newname, data: sdata});
                        });
                        stctl.scenelist.push({
                            id: stctl.scenelist.length - 1, value: newname
                        });
                        stctl.currscene = {id: stctl.scenelist.length - 1, value: newname};
                        stctl.loadScenario(stctl.scenelist[stctl.scenelist.length - 1]);
                    }
                }
            });
        });
    };
    //
    stctl.updateDb = function (entityId, fieldname, value) {
        dB.openStore("Scenario", function (store) {
            store.find($scope.selscene.value).then(function (scenario) {
                stctl.scenario = scenario.data;
                for (i = 0; i < stctl.scenario.Scenario.Entities.Entity.length; i++) {
                    if (stctl.scenario.Scenario.Entities.Entity[i]._id === entityId) {
                        stctl.scenario.Scenario.Entities.Entity[i][fieldname] = value;
                    }
                }
            }).then(function () {
                store.upsert({name: $scope.selscene.value, data: stctl.scenario});
            });
        });
    };
    stctl.updateScenario = function () {
        dB.openStore("Scenario", function (store) {
            store.upsert({name: $scope.selscene.value, data: stctl.scenario});
        });
    };
    stctl.copyScenario = function (currentscenario, newscenarioname) {
        dB.openStore("Scenario", function (store) {
            store.find(currentscenario).then(function (scenario) {
                store.insert({name: newscenarioname, data: scenario.data});
            });
        });
    };
    stctl.overwriteScenario = function (scenarioname) {
        console.log("overwriteScenario: " + scenarioname);
        dB.openStore("Scenario", function (store) {
            store.find(scenarioname).then(function () {
                store["delete"](scenarioname).then(function () {
                    store.insert({name: scenarioname, data: stctl.scenario});
                });
            });
        });
    };
    stctl.deleteScenario = function (currentscene) {
        DlgBx.confirm("Confirm deletion of Scenario: " + currentscene.value).then(function (yes) {
            //console.log("Confirm response:", response);
            if (yes && $scope.selscene.id !== 0) {
                console.log("Delete from Idb: " + currentscene.value);
                dB.openStore("Scenario", function (store) {
                    store[ "delete"](currentscene.value);
                });
                var na = [];
                for (i = 0; i < stctl.scenelist.length; i++) {
                    if (stctl.scenelist[i].value !== currentscene.value) {
                        na.push(stctl.scenelist[i]);
                    }
                }
                stctl.scenelist = na;
                stctl.loadScenario(stctl.scenelist[na.length - 1]);
            }
        });
    };
    //
    stctl.addFile = function (scenario, filename, data) {
        $http.post("/json/" + filename, data)
                .success(function () {
                    console.log("Saved " + scenario + " to /json/" + filename + ".json");
                    stctl.files.push({
                        id: stctl.files.length - 1, name: filename, scenario: scenario, url: "/json/" + filename
                    });
                    dB.openStore('Resources', function (store) {
                        store.upsert({
                            name: "files.json", url: resources[1], data: stctl.files
                        }).then(function () {
                            $http.post("/json/files.json", stctl.files).success(
                                    function () {
                                        console.log("Updated File List");
                                    });
                        });
                    });
                });
    };
    stctl.overwriteFile = function (scenario, filename, data) {
        $http.post("/json/" + filename, data)
                .success(function () {
                    console.log("Saved " + scenario + " to /json/" + filename + ".json");
                });
    };
    //
    stctl.toggleWaypoints = function () {
        if (stctl.showWP) {
            stctl.showWaypoints();
        } else {
            stctl.hideWaypoints();
        }
    };
    stctl.showUnit = function (unit) {
        if ($scope.netselected[unit._network]) {
            return $scope.netselected[unit._network].show;
        }
    };
    stctl.selectNetwork = function (net) {
        console.log("selectNetwork " + net._name);
        stctl.entities = GeoService.entities;
        if ($scope.netselected[net._name]) {
            if ($scope.netselected[net._name].show === true) {
                $scope.netselected[net._name].show = false;
                MsgService.leaveNet(net._name);
            } else {
                $scope.netselected[net._name].show = true;
                $scope.netselected[net._name].network = net._name;
                MsgService.joinNet(net._name);
            }
            GeoService.setNetViz(stctl.entities, $scope.netselected);
            return $scope.netselected[net._name].show;
        } else {
            $scope.netselected[net._name] = [];
            $scope.netselected[net._name].show = true;
            $scope.netselected[net._name].network = net._name;
            GeoService.setNetViz(stctl.entities, $scope.netselected);
            MsgService.joinNet(net._name);
            return $scope.netselected[GeoService.entities, net._name].show;
        }
    };
    stctl.netSelected = function (net) {
        if ($scope.netselected[net._name]) {
            return $scope.netselected[net._name].show;
        }
    };
    //
    MsgService.socket.on('connection', function (data) {
        MsgService.serverid = data.socketid;
        MsgService.connectServer(data, $scope.selscene.value, stctl.scenario);
    });
    MsgService.socket.on('unit connected', function (data) {
        console.log("Unit connected " + data.id);
        MsgService.setScenario($scope.selscene.value, stctl.scenario);
        //msgctl.messages.push({text: "Unit " + data.socketid + " connected"});

    });
    MsgService.socket.on('init server', function (data) {
        console.log('init server scenario ' + data.scenarioname);
        //console.log(data.scenariodata);
        dB.openStore("Scenario", function (store) {
            store.find(data.scenarioname).then(function (sdata) {
                //console.log(sdata.data);
                $scope.selscene.value = data.scenarioname;
                viewer.dataSources.remove(GeoService.sdatasources[$scope.selscene.value]);
                stctl.entities = sdata.data.Scenario.Entities.Entity;
                stctl.networks = sdata.data.Scenario.Networks.Network;
                GeoService.initGeodesy(data.scenarioname, sdata.data, $scope);
                GeoService.joinNetworks(stctl.entities, stctl.networks, MsgService, $scope);
            });
        });
    });
});
TacMapServer.controller('messageCtl', function ($indexedDB, $scope, $interval, GeoService, MsgService) {
    var msgctl = this;
    msgctl.dB = $indexedDB;
    msgctl.sipUrl = "http://localhost:8585/xml/test_sip3_response.xml";
    msgctl.ffiUrl = "http://localhost:8585/xml/currentFFI.xml";
    msgctl.sipTime = 0;
    msgctl.sipReq = false;
    msgctl.messages = [];
    //Move in increments of this many meters.
    msgctl.time = 0; //seconds
    msgctl.interval = 10000; //Rpt every 10 seconds
    msgctl.units = [];
    msgctl.movecount = 0;
    msgctl.moveleg = 10; //meters
    msgctl.running = false;
    msgctl.resetScenario = function () {
        console.log("resetScenario");
        msgctl.movecount = 0;
        msgctl.time = 0;
        msgctl.running = false;
        MsgService.socket.emit("scenario stopped");
        MsgService.socket.emit("scenario time",{time:msgctl.time});
        $interval.cancel(msgctl.playScenario);
        for (m = 0; m < msgctl.units.length; m++) {
            var mv = GeoService.movementsegments[msgctl.units[m]][0];
            if (mv) {
                GeoService.sdatasources[$scope.selscene.value].entities.getById(msgctl.units[m]).position = Cesium.Cartesian3.fromDegrees(mv.lon, mv.lat);
            }
        }
    };
    msgctl.runScenario = function () {
        console.log("playScenario");
        msgctl.running = true;
        MsgService.socket.emit("scenario running");
        for (var key in GeoService.movementsegments) {
            if (GeoService.movementsegments.hasOwnProperty(key)) { //to be safe                 
                msgctl.units.push(key);
            }
        }
        for (j = 0; j < msgctl.units.length; j++) {
            console.log(msgctl.units[j] + ": " + GeoService.movementsegments[msgctl.units[j]].length + " movements");
        }
        msgctl.playScenario = $interval(msgctl.moveUnits, msgctl.interval);
    };
    msgctl.pauseScenario = function () {
        console.log("pauseScenario");
        msgctl.running= false;
        MsgService.socket.emit("scenario stopped");
        $interval.cancel(msgctl.playScenario);
    }; //move units to location at specified time interval
    msgctl.moveUnits = function () {
        for (m = 0; m < msgctl.units.length; m++) {
            var mv = GeoService.movementsegments[msgctl.units[m]][msgctl.movecount];
            if (mv) {
                var unit = GeoService.entities[msgctl.units[m]];
                unit._location = mv.lat + "," + mv.lon;
                unit._rpttime = new Date().getTime();
                GeoService.sdatasources[$scope.selscene.value].entities.getById(unit._id).position = Cesium.Cartesian3.fromDegrees(mv.lon, mv.lat);
                msgctl.sendReport({unit: unit._id, to: unit._report_to, time: unit._rpttime, position: [mv.lat, mv.lon], network: unit._network});
            }
        }
        msgctl.movecount++;
        msgctl.time = (msgctl.movecount * msgctl.interval) / 1000;
        MsgService.socket.emit("scenario time",{time:msgctl.time});
    };
    msgctl.sendReport = function (msgobj) {
        //default ui
        MsgService.sendMessage(msgobj, msgobj.network);
    };
    msgctl.moveUnit = function (uid, sentto, net,lat, lon) {
        console.log("moveUnit: " + uid);
        GeoService.sdatasources[$scope.selscene.value].entities.getById(uid).position = Cesium.Cartesian3.fromDegrees(lon, lat);
        msgctl.sendReport({unit: uid, to: sentto, time: new Date(), position: [lat, lon], network: net});
    };
    MsgService.socket.on('error', console.error.bind(console));
    MsgService.socket.on('message', console.log.bind(console));
    MsgService.socket.on('msg sent', function (data) {
        msgctl.messages.push({text: "POSREP " + data.net + " " + data.message.unit});
        GeoService.sdatasources[$scope.selscene.value].entities.getById(data.message.unit).position = Cesium.Cartesian3.fromDegrees(data.message.position[1], data.message.position[0]);
    });
    MsgService.socket.on('unit disconnected', function (data) {
        console.log("Unit disconnected " + data.socketid);
        msgctl.messages.push({text: "Unit " + data.socketid + " disconnected"});
    });
    MsgService.socket.on('unit joined', function (data) {
        //console.log('Unit ' + data.unitid + ' Joined Network: ' + data.netname);
        msgctl.messages.push({text: 'Unit ' + data.unitid + ' Joined Network: ' + data.netname});
    });
    MsgService.socket.on('unit left', function (data) {
        console.log('Unit ' + data.unitid + ' Left Network: ' + data.netname);
        msgctl.messages.push({text: 'Unit ' + data.unitid + ' Left Network: ' + data.netname});
    });
    MsgService.socket.on('server joined', function (data) {
        //console.log('Joined Network: ' + data.netname);
        msgctl.messages.push({text: 'Joined Network: ' + data.netname});
    });
    MsgService.socket.on('server left', function (data) {
        //console.log('Left Network: ' + data.netname);
        msgctl.messages.push({text: 'Left Network: ' + data.netname});
    });
    MsgService.socket.on("start scenario", function () {
        msgctl.running= true;
        $scope.$apply();
    });
    MsgService.socket.on("stop scenario", function () {
        msgctl.running= false;
        $scope.$apply();
    });
        MsgService.socket.on("set time", function (data) {
        msgctl.time=data.time;
        $scope.$apply();
    });
    //
    msgctl.timeCalc = function (timeobj) {
        var day = timeobj.Day;
        var hr = timeobj.HourTime;
        var min = timeobj.MinuteTime;
        var sec = timeobj.SecondTime;
        var month = timeobj.MonthNumeric;
        var yr = timeobj.Year4Digit;
        var d = new Date(yr, month, day, hr, min, sec);
        return d.getTime();
    };
});
TacMapServer.controller('menuCtrl', function ($scope) {
    //initiate an array to hold all active tabs
    $scope.activeTabs = [];
    //check if the tab is active
    $scope.isOpenTab = function (tab) {
        //check if this tab is already in the activeTabs array
        if ($scope.activeTabs.indexOf(tab) > -1) {
            //if so, return true
            return true;
        } else {
            //if not, return false
            return false;
        }
    };
    //function to 'open' a tab
    $scope.openTab = function (tab) {
        //check if tab is already open
        if ($scope.isOpenTab(tab)) {             //if it is, remove it from the activeTabs array
            $scope.activeTabs.splice($scope.activeTabs.indexOf(tab), 1);
        } else {
            //if it's not, add it!
            $scope.activeTabs.push(tab);
        }
    };
    //function to leave a tab open if open or open if not
    $scope.leaveOpenTab = function (tab) {
        //check if tab is already open
        if (!$scope.isOpenTab(tab)) {
            //if it is not open, add to array
            $scope.activeTabs.push(tab);
        }
    };
});
// ***** SERVICES ******//
TacMapServer.factory('GeoService', function () {
    var geosvc = {
    };
    geosvc.entities = [];
    geosvc.waypoints = [];
    geosvc.scenename = null;
    geosvc.sdatasources = [];
    geosvc.wpdatasources = [];
    geosvc.movementsegments = [];
    geosvc.rptInterval = 10; //seconds
    geosvc.initGeodesy = function (scenename, scenariodata) {
        console.log("initGeodesy " + scenename);
        geosvc.scenename = scenename;
        geosvc.sdatasources[geosvc.scenename] = new Cesium.CustomDataSource(geosvc.scenename);
        viewer.dataSources.add(geosvc.sdatasources[geosvc.scenename]);
        geosvc.wpdatasources[geosvc.scenename] = new Cesium.CustomDataSource(geosvc.scenename + "WP");
        viewer.dataSources.add(geosvc.wpdatasources[geosvc.scenename]);
        //console.log(scenariodata);
        var polygons = scenariodata.Scenario.Polygons.Polygon;
        var entities = scenariodata.Scenario.Entities.Entity;
        geosvc.entities = scenariodata.Scenario.Entities.Entity;
        geosvc.addPolygons(polygons);
        geosvc.addEntities(entities);
        //console.log(geosvc.movementsegments);
        viewer.zoomTo(geosvc.sdatasources[geosvc.scenename].entities.getById("Default"));
        geosvc.setNetViz(entities, "");
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
        geosvc.sdatasources[geosvc.scenename].entities.add({
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
        geosvc.sdatasources[geosvc.scenename].entities.add({
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
        if (entity.waypoints) {
            geosvc.addStoredWaypoints(entity);
        }
    };
    geosvc.addStoredWaypoints = function (entity) {
        //console.log("addStoredWaypoints: " + entity._id);
        var w = entity.waypoints;
        var uid = entity._id;
        geosvc.waypoints[uid] = [];
        geosvc.waypoints[uid].push(w[0]);
        for (p = 1; p < w.length; p++) {
            geosvc.waypoints[uid].push(w[p]);
            var arr = [w[p - 1][1], w[p - 1][0], w[p][1], w[p][0]];
            geosvc.wpdatasources[geosvc.scenename].entities.add({
                id: uid + 'WP' + geosvc.waypoints[uid].length,
                polyline: {
                    positions: Cesium.Cartesian3.fromDegreesArray(arr),
                    width: 1,
                    material: Cesium.Color.LIGHTYELLOW
                }
            });
        }
        geosvc.setMovements(uid, geosvc.waypoints[uid]);
    };
    geosvc.setRptInc = function (meters) {
        geosvc.rptIncrement = meters;
    };
    geosvc.setMovements = function (uid, wpts) {
        // console.log('setMovements');
        geosvc.movementsegments[uid] = [];
        for (p = 1; p < wpts.length; p++) {
            var b = geosvc.calcBearing(wpts[p - 1][0], wpts[p - 1][1], wpts[p][0], wpts[p][1]);
            var d = geosvc.calcDistanceMeters(wpts[p - 1][0], wpts[p - 1][1], wpts[p][0], wpts[p][1]);
            geosvc.splitLine(uid, wpts[p - 1][0], wpts[p - 1][1], d, b, wpts[p - 1][2]);
        }
    };
    //Divide a line into increments based on speed and increment//time to get to next point governs interval .. 1000*speed/increment
    geosvc.splitLine = function (entityid, startlat, startlng, wpdist, bearing, speed) {         //console.log('splitLine ' + entityid + "," + startlat + "," + startlng + "," + dist + "," + bearing + "," + speed);
        var slat = startlat;
        var slng = startlng;
        //Divide wappoint segment into segments as long as unit will move in geosvc.rptInterval seconds == speed * geosvc.rptInterval
        var leglength = speed * geosvc.rptInterval;
        var seglength = Math.ceil(wpdist / leglength);
        while (seglength > 0) {
            geosvc.movementsegments[entityid].push({lat: slat, lon: slng});
            //console.log("move: " + entityid + ": from " + slat + ", " + slng + ", speed:" speed);
            var nextloc = geosvc.translateCoord(slat, slng, leglength, bearing);
            slat = nextloc[0];
            slng = nextloc[1];
            seglength--;
        }
    };
    geosvc.calcDistanceMeters = function (lat1, lng1, lat2, lng2) {
        var R = 6371000;
        // metres
        var lr1 = lat1 * Math.PI / 180; //to radians
        var lr2 = lat2 * Math.PI / 180;
        var lnr1 = lng1 * Math.PI / 180;
        var lnr2 = lng2 * Math.PI / 180;
        var x = (lnr2 - lnr1) * Math.cos((lr1 + lr2) / 2);
        var y = (lr2 - lr1);
        var d = Math.sqrt(x * x + y * y) * R;
        return d;
    };
    geosvc.calcBearing = function (lat1, lng1, lat2, lng2) {
        var lr1 = lat1 * Math.PI / 180; // to Radians
        var lr2 = lat2 * Math.PI / 180;
        var lnr1 = lng1 * Math.PI / 180;
        var lnr2 = lng2 * Math.PI / 180;
        var y = Math.sin(lnr2 - lnr1) * Math.cos(lr2);
        var x = Math.cos(lr1) * Math.sin(lr2) - Math.sin(lr1) * Math.cos(lr2) * Math.cos(lnr2 - lnr1);
        var brng = Math.atan2(y, x) * 180 / Math.PI;
        return brng;
    };
    geosvc.translateCoord = function (lat, lon, distance, bearing) {
        var coord = [];
        var R = 6371000;
        // meters , earth Radius approx
        var PI = 3.1415926535;
        var RADIANS = PI / 180;
        var DEGREES = 180 / PI;
        var lat2;
        var lon2;
        var lat1 = lat * RADIANS;
        var lon1 = lon * RADIANS;
        var radbearing = bearing * RADIANS;
        lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / R) + Math.cos(lat1) * Math.sin(distance / R) * Math.cos(radbearing));
        lon2 = lon1 + Math.atan2(Math.sin(radbearing) * Math.sin(distance / R) * Math.cos(lat1), Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2));
        coord = [lat2 * DEGREES, lon2 * DEGREES];
        return (coord);
    };
    geosvc.setNetViz = function (e, netsel) {
        geosvc.entities = e;
        for (i = 0; i < e.length; i++) {
            if (netsel[e[i]._network]) {
                if (netsel[e[i]._network].show) {
                    geosvc.sdatasources[geosvc.scenename].entities.getById(e[i]._id).show = true;
                    geosvc.showWP(e[i]._id);
                } else {
                    geosvc.sdatasources[geosvc.scenename].entities.getById(e[i]._id).show = false;
                    geosvc.hideWP(e[i]._id);
                }
            } else {
                geosvc.sdatasources[geosvc.scenename].entities.getById(e[i]._id).show = false;
                geosvc.hideWP(e[i]._id);
            }
        }
    };
    geosvc.showWP = function (uid) {
        if (geosvc.waypoints[uid]) {
            for (w = 1; w < geosvc.waypoints[uid].length + 1; w++) {
                if (geosvc.wpdatasources[geosvc.scenename].entities.getById(uid + 'WP' + w)) {
                    geosvc.wpdatasources[geosvc.scenename].entities.getById(uid + 'WP' + w).show = true;
                }
            }
        }
    };
    geosvc.hideWP = function (uid) {
        if (geosvc.waypoints[uid]) {
            for (w = 1; w < geosvc.waypoints[uid].length + 1; w++) {
                if (geosvc.wpdatasources[geosvc.scenename].entities.getById(uid + 'WP' + w)) {
                    geosvc.wpdatasources[geosvc.scenename].entities.getById(uid + 'WP' + w).show = false;
                }
            }
        }
    };
    geosvc.hideAllWP = function () {
        var wpent = geosvc.wpdatasources[geosvc.scenename].entities.values;
        for (p = 0; p < wpent.length; p++) {
            geosvc.wpdatasources[geosvc.scenename].entities.getById(wpent[p].id).show = false;
        }
    };
    geosvc.showAllWP = function () {
        var wpent = geosvc.wpdatasources[geosvc.scenename].entities.values;
        for (p = 0; p < wpent.length; p++) {
            geosvc.wpdatasources[geosvc.scenename].entities.getById(wpent[p].id).show = true;
        }
    };
    geosvc.joinNetworks = function (entities, networks, msgsvc, $scope) {
        console.log("joinNetworks");
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
TacMapServer.factory('MsgService', function () {
    var msgsvc = {
    };
    msgsvc.serverid;
    msgsvc.scenarioname;
    msgsvc.connected = false;
    msgsvc.sending = false;
    msgsvc.lastSendingTime = 0;
    msgsvc.units = [];
    msgsvc.socket = io();
    // Sends a message
    msgsvc.joinNet = function (netname) {
        msgsvc.socket.emit('server join', {serverid: msgsvc.serverid, netname: netname});
    };
    msgsvc.leaveNet = function (netname) {
        msgsvc.socket.emit('server leave', {serverid: msgsvc.serverid, netname: netname});
    };
    //
    msgsvc.setScenario = function (name, scenariodata) {
        msgsvc.socket.emit('set scenario', {scenarioname: name, scenariodata: scenariodata});
    };
    //
    msgsvc.sendMessage = function (msg, net) {
        var message = msg;
        console.log("sendMessage to " + net);
        //console.log("sendMessage from "+message.unit+" to "+message.to+" at "+message.time+" posrep: "+message.position[0]+", "+message.position[1]);
        // if there is a non-empty message and a socket connection
        if (message && msgsvc.connected) {
            // tell server to execute 'new message' and send along one parameter
            msgsvc.socket.emit('send msg', {net: net, message: message});
        }
    };
    msgsvc.connectServer = function (data, sname, scenariojson) {
        console.log(data.message + " " + data.socketid);
        msgsvc.connected = true;
        msgsvc.scenarioname = sname;
        //console.log(scenariojson);
        msgsvc.socket.emit('server connected', {message: 'server', socketid: data.socketid, scenarioname: msgsvc.scenarioname, scenariodata: scenariojson});
    };
    msgsvc.disconnectServer = function (data) {
        console.log("Server Disconnected " + data.socketid);
        msgsvc.connected = false;
        msgsvc.socket.emit('server disconnected', {message: 'server', socketid: data.socketid, scenario: msgsvc.scenarioname});
    };
    return msgsvc;
});
TacMapServer.factory('DlgBx', function ($window, $q) {
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
function syncResource($http, $scope, url, dB, stctl, GeoService) {
    $http.get(url).success(function (resdata, status, headers) {
        var mod = headers()['last-modified'];
        var filename = url.substring(url.lastIndexOf('/') + 1);
        dB.openStore('Resources', function (store) {
            store.getAllKeys().then(function (keys) {
                if (keys.indexOf(filename) === -1) {
                    store.upsert({name: filename, url: url, lastmod: mod, data: resdata});
                } else {
                    store.find(filename).then(function (dbrec) {
                        if (dbrec.lastmod !== mod) {
                            console.log('upsert ' + filename);
                            store.upsert({name: filename, url: url, lastmod: mod, data: resdata});
                        }
                    });
                }
            });
        });
        if (filename === 'defaultScenario.xml') {
            console.log('init geo');
            var spdata = xj.xml_str2json(resdata);
            stctl.scenario = spdata;
            stctl.networks = spdata.Scenario.Networks.Network;
            stctl.speeds = spdata.Scenario.Speeds.Speed;
            stctl.speedsel = stctl.speeds[0];
            stctl.entities = spdata.Scenario.Entities.Entity;
            GeoService.initGeodesy(spdata.Scenario._name, spdata, dB);
            dB.openStore('Scenario', function (store) {
                store.upsert({name: spdata.Scenario._name, data: spdata}
                ).then(function () {
                    dB.openStore('Scenario', function (store) {
                        store.getAllKeys().then(function (k) {
                            for (i = 0; i < k.length; i++) {
                                stctl.scenelist.push({
                                    id: i, value: k[i]
                                });
                            }
                            stctl.currscene = {id: 0, value: 'Default Scenario'};
                            $scope.selscene = {id: 0, value: 'Default Scenario'};
                        });
                    });
                });
            });
        }
        if (filename === 'files.json') {
            $http.get('/json/files.json').success(function (flist) {
                stctl.files = flist;
                dB.openStore('Resources', function (store) {
                    store.upsert({
                        name: "files.json", url: '/json/files.json', data: stctl.files
                    });
                });
            }).error(function () {
                stctl.files.push({id: 0, name: 'default.json', scenario: 'Default Scenario', url: '/json/default.json'});
                dB.openStore('Resources', function (store) {
                    store.upsert({
                        name: "files.json", url: '/json/files.json', data: stctl.files
                    }).then(function () {
                        store.find("files.json").then(function (f) {
                            console.log(f.data);
                            $http.post("/json/files.json", JSON.stringify(f.data));
                        });
                    });
                });
                dB.openStore('Scenario', function (store) {
                    store.find('Default Scenario').then(function (sdata) {
                        $http.post("/json/default.json", sdata.data);
                        console.log(sdata.data);
                    });
                });
            });
        }
    }).error(function () {
        console.log('Error getting resource');
    });
}
