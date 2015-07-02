

TacMap is a browser based track generation and communication tool which allows the designation of movement paths for simulated entities and periodic reporting of positions over time

### Get Started ###

To run the demo:
  1. Install Node.js
  2. Check out project
  3. In the TacMap directory type "npm install"
  4. In the TacMap directory type "node tacmap.js"
  5. Use an HTML5 compatible browser to go to "http://localhost:8585/server"
  6. Use an HTML5 compatible browser to go to "http://localhost:8585/unit"
  7. To import a scenario without planned paths use the "import" button in the Plan Scenario and select "Malmo"
  8. To select a scenario with planned paths use the "import" button in the Plan Scenario tab and select "Bydgoszcz"
  9. These Scenarios will be saved in the browser IndexedDB for selection under the Scenarios tab
  10. Use Set Location and Edit Waypoints check boxes with a selected unit to plan a scenario choose a speed to associate with movement segments.
  11. Click RUN to start movements.  Positions will be updated on the Server view and on any connected clients.
  12. The Networks buttons will select or obscure associated units
  13. Units and Networks are assigned in the defaultScenario.xml File

### Project Description ###
  • This project was developed to generate sample tracks for use in MIL STD messaging testing
  • All messages are generated, consumed and stored using Javascript in browsers.
  • Data persistence is achieved using HTML5 IndexedDb - which allows disconnected functionality after initialization.
  • Ground truth simulation is achieve using planned tracks which are interpreted as periodic position reports and communicated as JSON objects
  • JSON Objects can be converted into MIL STD message XML formats and converted to and from other formats using SAXON CE XSLT in the browser.  This functionality was demonstrated with NATO MTF FFI messages at CWIX 2015 disseminated using the NATO SIP3 SOAP based protocol..
  • A NodeJS server with SocketIO provides initialization with Javascript code and basic message relay without storage or other traditional server functions.  Socket.io is an event-driven Javascript library for real-time communications based on the WebSocket protocol.
  • The NodeJS server app implements an AngularJS module, largely to enforce a Model-View-Controller (MVC) pattern.
  • The browser client implements Javascript library Cesium for 3D mapping capabilities.
  • The functionality has been tested using Firefox and Chrome browsers.

Future collaborative work may include:
  • The communication of MIL-STD VMF binary messages directly to and from the browser client
  • The creation of MIL-STD messages such as VMF and MTF by user interactions with the visualization client and mapping capabilities.
  • Implementation of client/unit level track adjustments for Wargaming.
  • Implementation of proximity and visibility algorithms for Communication planning and Wargaming.
  • Packaging as an Android App for use as a lightweight tactical position reporting and display as a Combat Relevant PLI capability for individual operators and small units.

### Components Employed ###
  • Cesium Web Map
  • AngularJS Framework
  • HTML5 IndexedDb
  • SAXON CE XSLT library
  • Node.js
  • SocketIO

### License ###

[GPL 3.0](http://fsf.org/).  
