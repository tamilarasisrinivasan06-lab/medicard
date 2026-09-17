let connected = false;

function setDBStatus(isConnected) {
  connected = isConnected;
}

function getDBStatus() {
  return connected ? "connected" : "disconnected";
}

module.exports = { getDBStatus, setDBStatus };