(function(){
    const {ipcRenderer} = require('electron')
    window.REST = {};
    var ns = window.REST;

    ns.sync = function(method, options) {
        return ipcRenderer.sendSync('syncMethod', {method: method, options: options});
    }

    ns.async = function(method, options, callback) {
        ipcRenderer.once('asynchronous-reply', function(event, arg){
            callback(arg);
        });
        ipcRenderer.send('asyncMethod', {method: method, options: options});
    }

}());