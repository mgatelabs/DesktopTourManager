const {app, BrowserWindow, dialog} = require('electron')
const path = require('path')
const url = require('url')
var ipc = require('electron').ipcMain; //require('ipc');

//var ipcMain = require('electron').ipcMain
var fs = require('fs') // To read the directory listing

// In the main process.
global.sharedObject = {
  tour: {
    identifier: undefined
  }
};

// Context / Settings

var context = {
  files: [],
  paths: {
    sep: process.platform == 'win32' ? '\\' : '/',
    tours: undefined,
    settings: undefined
  },
  expressions: { // Modifible Regex expressions
    backRegEx: '^(?:([a-zA-Z0-9-~]+))\\.(png|jpg|jpeg)$',
    previewRegEx: '^(?:([a-zA-Z0-9-~]+))_1\\.(png|jpg|jpeg)$'
  },
  recent: [

  ],
  selected: undefined
};

var appDataPath = app.getPath('appData');
var appDateTourManager = appDataPath + context.paths.sep + 'TourManager';
if (!fs.existsSync(appDateTourManager)) {
  fs.mkdir(appDateTourManager);
}
context.paths.settings = appDateTourManager + context.paths.sep + 'settings.json';


// 

var commonRegEx = {
  tourFileName: /^.*\.tour$/,
  mediaFileName: /^[a-zA-Z0-9-_~]+\.(png|jpg|jpeg|mp4|sbs|m4v|mov|mp3|stream|mpo)$/,
  backgroundFileExtensions: /^(png|jpg|jpeg)$/,
  playableFileExtensions: /^(png|jpg|jpeg|mp4|sbs|m4v|mov|mp3|stream|mpo)$/,
  extractFileName: /^(?:([a-zA-Z0-9-_~]+))\.(?:([a-zA-Z4]{3,6}))$/
};

/**
 * Global Utility Methods
 */
var methods = {
  writeSettings: function(){
    var i, data = {
      paths: {
        tours: context.paths.tours
      },
      expressions: {
        backRegEx: context.expressions.backRegEx,
        previewRegEx: context.expressions.previewRegEx
      },
      recent: [

      ]
    };
    for (i = 0; i < context.recent.length && i < 5; i++) {
      data.recent.push(context.recent[i]);
    }
    fs.writeFileSync(context.paths.settings, JSON.stringify(data), {encoding: 'utf8'});
  },
  fileExistsIn: function(path, file) {
    return fs.existsSync(path + context.paths.sep + file);
  },

  readJson: function(path, defaultValue) {
    var content = undefined;
    if (fs.existsSync(path)) {
      content = fs.readFileSync(path, {encoding: 'utf8'});
    }
    if (content) {
      return JSON.parse(content);
    } else {
      return defaultValue || {};
    }
  },

  loadFiles: function(){
    context.files = [];

    if (!context.paths.tours) {
      // Skip no folder
      return;
    }

    var files = fs.readdirSync(context.paths.tours), i, file, found = {}, jsName, pngName;

    if (files && files.length > 0) {
      for (i = 0; i < files.length; i++) {
        file = files[i];
        if (file.match(commonRegEx.tourFileName)) {
          if (!found[file]) {
            found[file] = true;
            jsName = file + '.json';
            pngName = file + '.png';

            context.files.push({fileName: file, name: file, identifier: file, jsonFileName: jsName, jsonExists: methods.fileExistsIn(context.paths.tours, jsName), pngFileName: pngName, pngExists: methods.fileExistsIn(context.paths.tours, pngName)});
          }
        }
      }
    }

  },
  addKeyTo: function(key, name, value, map, list){
    var item = map[key];
    if (!item) {
      item = {key: key};
      map[key] = item;
      list.push(item);
    }
    item[name] = value;
  },
  copyFile: function(source, target, cb) {
  var cbCalled = false;
  var rd = fs.createReadStream(source);
    rd.on("error", function(err) {
      done(err);
    });
    var wr = fs.createWriteStream(target);
    wr.on("error", function(err) {
      done(err);
    });
    wr.on("close", function(ex) {
      done();
    });
    rd.pipe(wr);

    function done(err) {
      if (!cbCalled) {
        cb(err);
        cbCalled = true;
      }
    }
  },
  resizeImage: function(sourcePath, targetPath, maxWidth, maxHeight, forceSize, quality, callback){

    require('lwip').open(sourcePath, function(err, image){

      if (err) {
        callback(err);
      } else {

      var w = image.width(), h = image.height();

      if (forceSize) {
        w = maxWidth;
        h = maxHeight;
      } else {
        if (w > maxWidth) {
          w = 4096;
        }
        
        if (h > maxHeight) {
          h = 4096;
        }
      }

      image.batch()
        .resize(w, h)
        .writeFile(targetPath, 'jpg', {quality:quality}, function(err){
          callback(err);
        });
      }
    });

  }
};

(function(){
  var i, settings = methods.readJson(context.paths.settings);
  if (settings) {
    if (settings.paths && settings.paths.tours) {
      context.paths.tours = settings.paths.tours;
    }
    if (settings.expressions && settings.expressions.backRegEx) {
      context.expressions.backRegEx = settings.expressions.backRegEx;
    }
    if (settings.expressions && settings.expressions.previewRegEx) {
      context.expressions.previewRegEx = settings.expressions.previewRegEx;
    }
    if (settings.recent && settings.recent.length > 0) {
        context.recent = [];
        for (i = 0; i < settings.recent.length && i < 5; i++) {
          context.recent.push(settings.recent[i]);
        }
    }
  }
}());

/**
 * Fake Rest Methods
 */
var restMethods = {
	/** Dasboards **/
  getRecents: function() {
    var result = {recents: context.recent};
    result.code = 'OK';
    return result;
  },

	/** Tour Management **/
  getTours: function() {
    var result = {paths: {tours: context.paths.tours || ''}};
    if (!context.paths.tours) {
      result.code = 'FAIL';
      result.msgs = ['Please setup location to tours folder in order to continue'];
    } else {
      result.code = 'OK';
      result.items = context.files;
    }
    return result;
  },
  getTourInfo: function(options) {
    var tour = options.identifier, backgroundId, full = !options.minimum;

    var result = {code: 'OK', definition: {}, files: [], backgrounds: [], index: {}};
    var tourFolder = context.paths.tours + tour + context.paths.sep;
    var infoFile = context.paths.tours + tour + context.paths.sep + "index.tour.json";
    var configFile = context.paths.tours + tour + context.paths.sep + "config.tour.json";
    var tourPreview = context.paths.tours + tour + ".png";
    var tourJson = context.paths.tours + tour + ".json";

    result.folder = tourFolder;

    result.definition.type = 'DEFINITION';
    result.definition.name = tour;
    result.definition.preview = 'DEFINITION';
    if (full) {
      result.definition.json = methods.readJson(tourJson);
    }

    var mediaFiles = fs.readdirSync(tourFolder), i, file;

    var backgroundRegEx = new RegExp(context.expressions.backRegEx);
    var previewRegEx = new RegExp(context.expressions.previewRegEx);
    var backgroundLinker = {};

    if (mediaFiles && mediaFiles.length > 0) {
      for (i = 0; i < mediaFiles.length; i++) {
        file = mediaFiles[i];
        if (file.match(commonRegEx.mediaFileName)) {
            var mediaJsonPath = tourFolder + file + '.json';
            var mediaPreviewPath = tourFolder + file + '.png';

            var mediaItem = {};

            mediaItem.type = 'MEDIA';
            mediaItem.name = file;
            mediaItem.preview = fs.existsSync(mediaPreviewPath);
            mediaItem.json = methods.readJson(mediaJsonPath, {display: file});

            result.files.push(mediaItem);
        }

        var backgroundMatch = backgroundRegEx.exec(file);
        if (backgroundMatch && backgroundMatch[1]) {
          backgroundId = backgroundMatch[1];
          methods.addKeyTo(backgroundId, 'content', file, backgroundLinker, result.backgrounds);
        }

        backgroundMatch = previewRegEx.exec(file);
        if (backgroundMatch && backgroundMatch[1]) {
          backgroundId = backgroundMatch[1];
          methods.addKeyTo(backgroundId, 'preview', file, backgroundLinker, result.backgrounds);
        }
      }
    }

    for (i = result.backgrounds.length - 1; i>= 0; i--) {
      file = result.backgrounds[i];
      if ((!file.content || !file.preview)) {
        result.backgrounds.splice(i, 1);
      }
    }

    // Index hold room info
    result.index.type = 'INDEX';
    result.index.name = "index.tour.json";
    result.index.preview = false;
    if (full) {
      result.index.json = methods.readJson(infoFile);
    }

    if (full) {
      var display = result.definition.json.display || tour;
      for (i = 0; i < context.recent.length; i++) {
        if (context.recent[i].tourId == tour) {
          context.recent.splice(i, 1);
          break;
        }
      }
      context.recent.splice(0,0, {display: display, tourId: tour});
      if (context.recent.length > 5) {
        context.recent.splice(5, context.recent.length - 5);
      }
      methods.writeSettings();
    }

    return result;
  },
  putTourInfo: function(options){
    var result = {code: 'OK', msgs: []};

    var tour = options.identifier;
    var definition = JSON.stringify(options.definition);
    var info = JSON.stringify(options.index);

    var definitionFile = context.paths.tours + tour + ".json";

    var infoFile = context.paths.tours + tour + context.paths.sep + "index.tour.json";

    try {
      fs.writeFileSync(definitionFile, definition, {encoding: 'utf8'});

      fs.writeFileSync(infoFile, info, {encoding: 'utf8'});

      var display = definition.display || tour;
      for (i = 0; i < context.recent.length; i++) {
        if (context.recent[i].tourId == tour) {
          context.recent.splice(i, 1);
          break;
        }
      }
      context.recent.splice(0,0, {display: display, tourId: tour});
      if (context.recent.length > 5) {
        context.recent.splice(5, context.recent.length - 5);
      }
      methods.writeSettings();

    } catch (ex) {
      result.code = 'FAIL';
      result.msgs.push(ex);
    }

    return result;
  },
  deleteTour: function(options){
	var result = {code: 'OK', msgs: []}, tour = options.tourId;
	
	if (!context.paths.tours) {
      result.code = 'FAIL';
      result.msgs.push('Please setup location to tours folder to continue');
    } else {
		var tourFolder = context.paths.tours + tour + context.paths.sep;
		
		var files = fs.readdirSync(tourFolder), i, file;

		try {
		
			if (files && files.length > 0) {
			  for (i = 0; i < files.length; i++) {
				file = tourFolder + files[i];
				fs.unlinkSync(file)
			  }
			}
			
			fs.rmdirSync(tourFolder);
			var infoFile = context.paths.tours + tour + context.paths.sep + "index.tour.json";
			var tourPreview = context.paths.tours + tour + ".png";
			var tourJson = context.paths.tours + tour + ".json";
			if (fs.existsSync(infoFile)) fs.unlinkSync(infoFile);
			if (fs.existsSync(tourPreview)) fs.unlinkSync(tourPreview);
			if (fs.existsSync(tourJson)) fs.unlinkSync(tourJson);
			
			methods.loadFiles();
		} catch (ex) {
			result.code = 'FAIL';
			result.msgs.push('Unable to delete: ' + ex);
		}
	}
	return result;
  },
  createTour: function(options){
    var result = {code: 'OK', msgs: []}, tour = options.tourId + '.tour', name = options.tourName;

    if (!context.paths.tours) {
      result.code = 'FAIL';
      result.msgs.push('Please setup location to tours folder to continue');
    } else {

        var tourFolder = context.paths.tours + tour;
        var definitionFile = context.paths.tours + tour + ".json";
        var infoFile = context.paths.tours + tour + context.paths.sep + "index.tour.json";

        //console.log(fs.existsSync(tourFolder));
        //console.log(fs.existsSync(definitionFile));
        //console.log(fs.existsSync(infoFile));

        if (fs.existsSync(definitionFile)) {
          result.code = 'FAIL';
          result.msgs.push('Tour with same identifier already exists');
          return result;
        } else {

          var definitionJson = JSON.stringify({
            display: name,
            type: 10,
            present: false
          });

          var infoJson = JSON.stringify({
            version: {
              major: 1,
              minor: 0
            },
            title: name,
            tool: "tourmanager",
            rooms: []
          });

          try {

            fs.mkdir(tourFolder);

            fs.writeFileSync(definitionFile, definitionJson, {encoding: 'utf8'});

            fs.writeFileSync(infoFile, infoJson, {encoding: 'utf8'});
			
			methods.loadFiles();
          } catch (ex) {
            result.code = 'FAIL';
            result.msgs.push(ex);
          }
        }
    }

    return result;
  },
  
  /****************************************************************************
   *  Import
   * *************************************************************************/

  processImportCommand: function(options, callback) {
    var result = {code: 'OK', msgs: []}, tour = options.identifier, command = options.command, sourcePath, targetPath;

    sourcePath = options.dir + command.filename;
    targetPath = context.paths.tours + tour + context.paths.sep + command.target + '.' + command.ext;

    switch (command.type) {
      case 'COPY': {
        methods.copyFile(sourcePath, targetPath, function(err){
          var result = {code: 'OK', msgs: []};
          if (err) {
            result.code = 'FAIL';
            result.msgs.push(err);
          } else {
            result.msgs.push('Copied file from ' + sourcePath + ' to ' + targetPath);
          }
          callback(result);
        });
      } break;
      case 'BACK': {

        methods.resizeImage(sourcePath, targetPath, 4096, 4096, false, 85, function(err){
          var result = {code: 'OK', msgs: []};
          if (err) {
            result.code = 'FAIL';
            result.msgs.push(err);
          } else {
            result.msgs.push('Resized file from ' + sourcePath + ' to ' + targetPath);
          }
          callback(result);
        });

      } break;
      case 'PREVIEW': {

        methods.resizeImage(sourcePath, targetPath, 256, 256, true, 55, function(err){
          var result = {code: 'OK', msgs: []};
          if (err) {
            result.code = 'FAIL';
            result.msgs.push(err);
          } else {
            result.msgs.push('Resized file from ' + sourcePath + ' to ' + targetPath);
          }
          callback(result);
        });

      } break;
    }
    
    return result;
  },

  findImportableFiles: function(options) {
    var result = {code: 'OK', msgs: [], dir: '', files: []};

    var tour = options.identifier;

    var dir = dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    });
    if (dir) {
      if (!(dir[dir.length - 1] == '\\' || dir[dir.length - 1] == '/')) {
        dir += context.paths.sep;
      }

      result.dir = dir;

      // Parse files from folder
      var mediaFiles = fs.readdirSync(dir), i, file;

      if (mediaFiles && mediaFiles.length > 0) {
        for (i = 0; i < mediaFiles.length; i++) {
          file = mediaFiles[i];
          if (file.match(commonRegEx.extractFileName)) {
            var nameMatch = commonRegEx.extractFileName.exec(file);
            if (nameMatch && nameMatch[1] && nameMatch[2]) {
              var name = nameMatch[1], ext = nameMatch[2].toLowerCase();
              if (ext == 'jpeg') {
                ext = 'jpg';
              }
              result.files.push({filename: file, name: nameMatch[1], ext: ext, playable: ext.match(commonRegEx.playableFileExtensions) ? true : false, backgroundable: ext.match(commonRegEx.backgroundFileExtensions) ? true : false});
            }
          }
        }
      } else {
        result.code = 'FAIL';
        result.msgs.push('Directory is empty');
      }

    } else {
      result.code = 'FAIL';
    }
    return result;
  },

  /****************************************************************************
   *  Settings
   * *************************************************************************/
  
  getSettings: function() {
    var result = {
      expressions: {
        backRegEx: context.expressions.backRegEx,
        previewRegEx: context.expressions.previewRegEx
      },
      paths: {tours: context.paths.tours || ''}
    };
    if (!context.paths.tours) {
      result.code = 'FAIL';
      result.msgs = ['Please setup location to tours folder to continue'];
    } else {
      result.code = 'OK';
    }
    return result;
  },
  
  pickToursLocation: function() {
    var result = {code: 'OK', msgs: []};

    var dir = dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    });
    if (dir) {
      if (!(dir[dir.length - 1] == '\\' || dir[dir.length - 1] == '/')) {
        dir += context.paths.sep;
      }

      context.paths.tours = dir;
      result.dir = dir;

      methods.writeSettings();
      methods.loadFiles();
    } else {
      result.code = 'FAIL';
    }
    return result;
  },

  /****************************************************************************
   *  TEST
   * *************************************************************************/

  testAsync: function(option, callback){
    setInterval(function(){
      callback({code:'OK'});
    }, 2000);
  }
};

methods.loadFiles();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 1024, height: 768, minWidth: 1024, minHeight: 600, icon: __dirname + '/icon.ico'})

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, !context.paths.tours ? 'welcome.htm' : 'dashboard.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  //win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

/**
 * Create the fakeRestCallback
 */
ipc.on('syncMethod', function(event, arg) {
  console.log(arg);
  
  var methodName = arg['method'], options = arg['options'];

  if (methodName && restMethods[methodName]) {
      event.returnValue = (restMethods[methodName](options));
  } else {
    event.returnValue = ({code: 'FAIL', msg: 'Unknown Rest Method'});
  }
});

ipc.on('asyncMethod', function(event, arg) {
  console.log(arg);
  var methodName = arg['method'], options = arg['options'];
  if (methodName && restMethods[methodName]) {
      event.returnValue = (restMethods[methodName](options, function(result){
        event.sender.send('asynchronous-reply', result);
      }));
      event.returnValue = ({code: 'OK', msg: 'Please wait'});
  } else {
    event.returnValue = ({code: 'FAIL', msg: 'Unknown Rest Method'});
  }
});