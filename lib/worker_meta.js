class WorkerMetaData {
  constructor(type, customId) {
    this.type = type;
    this.customId = customId;
  }

  isServer() {
    return this.type === 'server';
  }

  isRunner() {
    return this.type === 'runner';
  }
}

var clusterMap = {};
var runnerIdCounter = 0;
var serverIdCounter = 0;

module.exports = {
  WorkerMetaData,
  clusterMap,
  registerRunnerWorker(workerId) {
    var customId = (runnerIdCounter || 0) + 1;
    clusterMap[workerId] = new WorkerMetaData('runner', `r-${customId}`);
    runnerIdCounter = customId;
  },
  registerServerWorker(workerId) {
    var customId = (serverIdCounter || 0) + 1;
    clusterMap[workerId] = new WorkerMetaData('server', `s-${customId}`);;
    serverIdCounter = customId;
  },
};
