const {app, BrowserWindow, dialog, Menu} = require('electron');
const {shell} = require('electron');
const defaultMenu = require('electron-default-menu');
const path = require('path');
const url = require('url');
var ipc = require('electron').ipcMain; // Fake Rest
const env = require('./env'); // Run-time Variables
var fs = require('fs') // Files
var archiver = require('archiver'); // Zipping
// Language
var i18next = require('i18next');
var Backend = require('i18next-sync-fs-backend');

// Fixes

app.commandLine.appendSwitch('--ignore-gpu-blacklist');

// In the main process.
global.sharedObject = {
  tour: {
    identifier: undefined
  },
  version: app.getVersion()
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
    previewRegEx: '^(?:([a-zA-Z0-9-~]+))_1\\.(png|jpg|jpeg)$',
    sampleFileName: 'DSCN0045.JPG',
    previewKey: '#KEY#_1'
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
  fixFileExtensions: /^(png|jpg|jpeg)$/,
  extractFileNameString:'^(?:([a-zA-Z0-9-_~]+))\.(?:([a-zA-Z34]{3,6}))$',
  extractFileName: /^(?:([a-zA-Z0-9-_~]+))\.(?:([a-zA-Z34]{3,6}))$/
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
        previewRegEx: context.expressions.previewRegEx,
        sampleFileName: context.expressions.sampleFileName,
        previewKey: context.expressions.previewKey
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

      if (forceSize === true) {
        w = maxWidth;
        h = maxHeight;
      } else if (forceSize === false) {
        if (w > maxWidth) {
          w = 4096;
        }
        
        if (h > maxHeight) {
          h = 4096;
        }
      } else {
        if (w > maxWidth) {
          h = (h * 4096) / w;
          w = 4096;
        }
        if (h > maxHeight) {
          w = (w * 4096) / h;
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
    if (settings.expressions && settings.expressions.sampleFileName) {
      context.expressions.sampleFileName = settings.expressions.sampleFileName;
    }
    if (settings.expressions && settings.expressions.previewKey) {
      context.expressions.previewKey = settings.expressions.previewKey;
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
 * Rest Methods
 */
var restMethods = {
	/****************************************************************************
   * Dasboards
   ***************************************************************************/
  
  /**
   * Get the recently edited/viewed tours
   * Type: SYNC
   */
  getRecents: function() {
    var result = {recents: context.recent};
    result.code = 'OK';
    return result;
  },

	/****************************************************************************
   * Tour Management
   ***************************************************************************/

  /**
   * List all available tours
   * Type: SYNC
   */
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

  /**
   * Read a tour
   * Type: SYNC
   */
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

  /**
   * Save a tour
   * Type: SYNC
   */
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

  /**
   * Remove a tour
   * Type: SYNC
   */
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

  /**
   * Create a zip file from a tour
   * Type: SYNC
   */
  zipTour: function(options, callback){
    var result = {code: 'OK', msgs: []}, tour = options.tourId;

    if (!context.paths.tours) {
      result.code = 'FAIL';
      result.msgs.push('Please setup location to tours folder to continue');
    } else {

      var tourFolder = context.paths.tours + tour + context.paths.sep;
		
      var tourZip = context.paths.tours + tour + ".zip";

      if (fs.existsSync(tourZip)) fs.unlinkSync(tourZip);

      var infoFile = context.paths.tours + tour + context.paths.sep + "index.tour.json";
			var tourPreview = context.paths.tours + tour + ".png";
			var tourJson = context.paths.tours + tour + ".json";

		  //var files = fs.readdirSync(tourFolder), i, file;

      var output = fs.createWriteStream(tourZip);

      var archive = archiver('zip', {
          store: true // Sets the compression method to STORE. 
      });

      archive.pipe(output);

      archive.append(fs.createReadStream(tourJson), { name: tour + ".json" });
      if (fs.existsSync(tourPreview)) {
        archive.append(fs.createReadStream(tourPreview), { name: tour + ".png" });
      }

      archive.directory(tourFolder, tour);

      archive.finalize();
    }

    callback(result);
  },

  /**
   * Create a new tour
   * Type: SYNC
   */
  createTour: function(options){
    var result = {code: 'OK', msgs: []}, tour = options.tourId + '.tour', name = options.tourName;

    if (!context.paths.tours) {
      result.code = 'FAIL';
      result.msgs.push('Please setup location to tours folder to continue');
    } else {

        var tourFolder = context.paths.tours + tour;
        var definitionFile = context.paths.tours + tour + ".json";
        var infoFile = context.paths.tours + tour + context.paths.sep + "index.tour.json";

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

  /**
   * Run a import command and return the 
   * Type: ASYNC
   */
  processImportCommand: function(options, callback) {
    var result = {code: 'OK', msgs: []}, tour = options.identifier, command = options.command, sourcePath, targetPath, i, ch;

    if (!command.target) {
      var result = {code: 'OK', msgs: []};
      result.code = 'FAIL';
      result.msgs.push('Missing target name');
      callback(result);
      return  result;
    }

    sourcePath = options.dir + command.filename;
    targetPath = context.paths.tours + tour + context.paths.sep + command.target + '.' + command.ext;

    // Verify that the target name is valid
    for (i = 0; i < command.target.length; i++) {
      ch = command.target[i];
      switch (ch) {
        case '-':
        case '_':
        case '~': {
          // GOOD
        } break;
        default: {
          if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')) {
            // GOOD
          } else {
            var result = {code: 'OK', msgs: []};
            result.code = 'FAIL';
            result.msgs.push("Invalid character in target name");
            callback(result);
            return  result;
          }
        } break;
      }
    }

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
      case 'FIX': {
        methods.resizeImage(sourcePath, targetPath, 4096, 4096, 'FIX', 85, function(err){
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

  /**
   * Try to find files you want to import
   * Type: SYNC
   */
  findImportableFiles: function(options) {
    var result = {code: 'OK', msgs: [], dir: '', files: []};

    result.previewKey = context.expressions.previewKey;

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
      var mediaFiles = fs.readdirSync(dir), i, j, file, cleaned, ch, lastSince = false;

      if (mediaFiles && mediaFiles.length > 0) {
        for (i = 0; i < mediaFiles.length; i++) {
          cleaned = [];
          file = mediaFiles[i];
          for (j = 0; j < file.length; j++) {
            ch = file[j];
            if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '.' || ch == '-' || ch == '~') {
              cleaned.push(ch);
              lastSince = true;
            } else {
              if (lastSince) {
                cleaned.push('-');
              }
              lastSince = false;
            }
            // skip bad file names
          }
          cleaned = cleaned.join('');
          if (cleaned.match(commonRegEx.extractFileName)) {
            var nameMatch = commonRegEx.extractFileName.exec(cleaned);
            if (nameMatch && nameMatch[1] && nameMatch[2]) {
              var name = nameMatch[1], ext = nameMatch[2].toLowerCase();
              if (ext == 'jpeg') {
                ext = 'jpg';
              }
              result.files.push({filename: file, name: nameMatch[1], ext: ext, fixable: ext.match(commonRegEx.fixFileExtensions) ? true : false, playable: ext.match(commonRegEx.playableFileExtensions) ? true : false, backgroundable: ext.match(commonRegEx.backgroundFileExtensions) ? true : false});
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
  
  /**
   * Get settings from AppData
   * Type: SYNC
   */
  getSettings: function() {
    var result = {
      expressions: {
        backRegEx: context.expressions.backRegEx,
        previewRegEx: context.expressions.previewRegEx,
        sampleFileName: context.expressions.sampleFileName,
        extractFileNameString: commonRegEx.extractFileNameString,
        previewKey: context.expressions.previewKey
      },
      paths: {
        tours: context.paths.tours || '',
        settings: context.paths.settings
    }
    };
    if (!context.paths.tours) {
      result.code = 'FAIL';
      result.msgs = ['Please setup location to tours folder to continue'];
    } else {
      result.code = 'OK';
    }
    return result;
  },
  
  /**
   * Choose where to find tours
   */
  pickToursLocation: function() {
    var result = {code: 'OK', msgs: []};

    // Show the folder chooser
    var dir = dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    });
    // Did the select a folder?
    if (dir) {
      if (!(dir[dir.length - 1] == '\\' || dir[dir.length - 1] == '/')) {
        dir += context.paths.sep;
      }
      // Update paths
      context.paths.tours = dir;
      result.dir = dir;
      // Save everything
      methods.writeSettings();
      methods.loadFiles();
    } else {
      result.code = 'FAIL';
    }
    return result;
  },

  /**
   * Save settings to local storage
   * Type: SYNC
   */
  updateRegExSettings: function(options){
    var result = {code: 'OK', msgs: []};

    context.expressions.backRegEx = options.backRegEx;
    context.expressions.previewRegEx = options.previewRegEx;
    context.expressions.sampleFileName = options.sampleFileName;
    context.expressions.previewKey = options.previewKey;

    methods.writeSettings();
    methods.loadFiles();

    return result;
  },

  /****************************************************************************
   *  Make sure Async connections work
   * *************************************************************************/

  testAsync: function(option, callback){
    setTimeout(function(){
      callback({code:'OK'});
    }, 2000);
    return {code:'OK'};
  },

  /****************************************************************************
   *  Open An External URL
   * *************************************************************************/

  openUrl: function(option, callback){
    var result = {code: 'OK', msgs: []};
    shell.openExternal(option.url, {active:true});
    return result;
  }

};

methods.loadFiles();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 1024, height: 768, minWidth: 1024, minHeight: 600, title: i18next.t('app.title') + ' - ' + i18next.t('app.subtitle'), icon: __dirname + '/icon.ico'})

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
app.on('ready', () => {
  const menu = defaultMenu(app, shell);  
  var i = 0, j;

  if (!env.devTools) {
    
    for (i = 0; i < menu.length; i++) {
      if (menu[i].label == 'View') {
        for (j = 0; j < menu[i].submenu.length; j++) {
          if (menu[i].submenu[j].label == 'Toggle Developer Tools') {
            menu[i].submenu.splice(j,1);
            break;
          }
        }
        break;
      }
    }
  }

  for (i = menu.length - 1; i >= 0; i--) {
      if (menu[i].role == 'help') {
        menu.splice(i, 1);
      } else if (menu[i].label == 'Edit') {
        menu.splice(i, 1);
      }
  }

  // Set top-level application menu, using modified template 
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu));

  i18next
    .use(Backend)
    .init({
      debug:false,
      lng: 'en',
      lngs: ['en', 'dev'],
      ns:'main',
      defaultNS:'main',
      initImmediate: false,
      backend: {
        // path where resources get loaded from 
        loadPath: path.join(__dirname, 'locales', '{{lng}}','{{ns}}.json')
      }
    }, function(err, t){
      if (env.devTools && err) {
        console.log(err);
      }
      // Only create the window when the languages are ready
      createWindow();
    });
});




// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

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
  if (env.devTools) {
    console.log(arg);
  }
  var methodName = arg['method'], options = arg['options'];

  if (methodName && restMethods[methodName]) {
      event.returnValue = (restMethods[methodName](options));
  } else {
    event.returnValue = ({code: 'FAIL', msg: 'Unknown Rest Method'});
  }
});

ipc.on('asyncMethod', function(event, arg) {
  if (env.devTools) {
    console.log(arg);
  }
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