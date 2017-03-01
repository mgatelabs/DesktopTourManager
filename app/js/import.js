(function(){

    window.MG = window.MG || {};
    MG.edit = MG.edit || {};
    var ns = MG.edit;

    ns.fileBody = undefined;
    ns.lastSelectRequest = {};

    ns.commands = [];
    ns.commandIndex = -1;

    ns.selectFolder = function(){
        ns.fileBody.empty();
        var data = REST.sync('findImportableFiles', {identifier: ns.tourId});

        $('#wrap').fadeIn();

        ns.lastSelectRequest = data;
        if (data.code == 'OK') {

            ns.previewKey = data.previewKey || '#KEY#_1';

            var tr, td, file, i, input, span;

            for (i = 0; i < data.files.length; i++) {
                file = data.files[i];
                tr = $('<tr></tr>').attr('index', i).addClass('availableFile');

                td = $('<td></td>').appendTo(tr).text(file.filename);

                td = $('<td></td>').appendTo(tr);
                input = $('<input>').attr('type', 'text').val(file.name).appendTo(td);

                td = $('<td></td>').css('text-align','center').appendTo(tr).text(file.ext);

                td = $('<td></td>').css('text-align','center').appendTo(tr);
                input = $('<input class="hideMe" type="radio"/>').attr('name', 'item' + i).val('BACK').appendTo(td).prop('disabled', !file.backgroundable);
                
                td = $('<td></td>').css('text-align','center').appendTo(tr);
                input = $('<input class="hideMe" type="radio" style="margin-left:1em;"/>').attr('name', 'item' + i).val('FIX').appendTo(td).prop('disabled', !file.fixable);
                

                td = $('<td></td>').css('text-align','center').appendTo(tr);
                input = $('<input class="hideMe" type="radio" style="margin-left:1em;"/>').attr('name', 'item' + i).val('COPY').appendTo(td).prop('disabled', !file.playable);
                
                td = $('<td></td>').css('text-align','center').appendTo(tr);
                input = $('<input class="hideMe" type="radio" style="margin-left:1em;" checked/>').attr('name', 'item' + i).val('IGNORE').appendTo(td);

                tr.appendTo(ns.fileBody);

                tr = $('<tr style="display:none;"></tr>').attr('index', i).addClass('errorFile');
                td = $('<td colspan="7" class="errorDest"></td>').appendTo(tr);

                tr.appendTo(ns.fileBody);
            }

        }
    };

    ns.processFolder = function(){

        var commands = [], tempCommands = [], temp, ignores = [], i, file, knownNames = {}, errors = [];

        // Clear all old errors
        ns.fileBody.find('tr.errorFile').hide();
        $('.errorDest').empty();

        // Build the set of actions that need to take place
        ns.fileBody.find('tr.availableFile').each(function(){
            var ref = $(this), j, temp, tempKey, i = ref.attr('index') - 0, item = ns.lastSelectRequest.files[i], target = ref.find('input[type=text]').val(), choice = ref.find('input[type=radio]').filter(':checked').val();
            switch(choice) {
                case 'BACK': {
                    tempCommands.push({index:i, type:'BACK', filename:item.filename, target:target, ext: 'jpg'});
                    tempCommands.push({index:i, type:'PREVIEW', filename:item.filename, target: ns.previewKey.replace('#KEY#', target), ext: 'jpg'});
                } break;
                case 'FIX': {
                    tempCommands.push({index:i, type:'FIX', filename:item.filename, target:target, ext: 'jpg'});
                } break;
                case 'COPY': {
                    tempCommands.push({index:i, type:'COPY', filename:item.filename, target:target, ext: item.ext});
                } break;
                case 'IGNORE': {
                    ignores.push({index:i, type:'IGNORE'});
                    ns.warnAt(i, 'Skipped');
                } break;
            }
            if (tempCommands.length > 0) {
                for (j = 0; j < tempCommands.length; j++) {
                    temp = tempCommands[j];
                    tempKey = temp.target + '.' + temp.ext;
                    if (knownNames[tempKey]) {
                        errors.push({index: i, msg: 'Duplicate Target + Extention Found'});
                    } else {
                        knownNames[tempKey] = temp;
                        commands.push(temp);
                    }                
                }
                tempCommands = [];
            }
        });

        if (commands.length > 0) {
            var data = REST.sync('getTourInfo', {identifier: ns.tourId, minimum: true});
            // Loop and chech all changes
            for (i = 0; i < data.files.length; i++) {
                file = data.files[i];
                temp = knownNames[file.name];
                if (temp) {
                    errors.push({index: temp.index, msg: 'Error: File with name (' + file.name + ') already exists in destination folder'});
                }
            }
        }

        if (errors.length > 0) {
            // Mark errors
            for (i = 0; i < errors.length; i++) {
                temp = errors[i];
                ns.errorAt(temp.index, temp.msg);
            }

            for (i = 0; i < commands.length; i++) {
                temp = commands[i];
                ns.errorAt(temp.index, 'Process: ' + temp.type + ' has been canceled');
            }

        } else {
            ns.commands = commands;
            ns.commandIndex = 0;
            ns.startProcess();
        }

        console.log(commands);
    };

    ns.processCommand = function() {

        if (ns.commandIndex < ns.commands.length) {
            var temp = ns.commands[ns.commandIndex];
            ns.infoAt(temp.index, 'Processing command: ' + temp.type);
            REST.async('processImportCommand', {identifier: ns.tourId, dir:ns.lastSelectRequest.dir, command: temp} , function(result){
                if (result.code == 'OK') {
                    if (result.msgs.length > 0) {
                        ns.successAt(temp.index, result.msgs[0]);
                    } else {
                        ns.successAt(temp.index, 'OK');
                    }
                    ns.nextCommand();
                } else {
                    ns.errorAt(temp.index, (result.msgs && result.msgs.length > 0 && result.msgs[0]) || "Unknown error");
                    // Error
                    $('#progress').addClass('progress-bar-danger');
                    ns.processEnded();
                }
            });
        } else {
            $('#progress').attr('valuenow', 100).css('width', '100%').find('.sr-only').text('100% Complete');
            ns.processEnded();
        }
    }

    ns.nextCommand = function() {
        ns.commandIndex++;
        var percent = Math.floor(((ns.commandIndex * 1.0) / ((ns.commands.length + 1) * 1.0)) * 100);
        $('#progress').addClass('active').attr('valuenow', percent).css('width', percent + '%').find('.sr-only').text(percent + '% Complete');
        setTimeout(function(){
            ns.processCommand();
        },10);
    }

    ns.infoAt = function(index, msg) {
        ns.msgAt(index, msg, 'info');
    }

    ns.successAt = function(index, msg) {
        ns.msgAt(index, msg, 'success');
    }

    ns.warnAt = function(index, msg) {
        ns.msgAt(index, msg, 'warning');
    }

    ns.errorAt = function(index, msg) {
        ns.msgAt(index, msg, 'danger');
    }

    ns.msgAt = function(index, msg, status) {
        var div = $('<div></div>').append($('<span class="label label-'+status+'"></span>').text(msg));
        ns.fileBody.find('tr.errorFile').filter('[index='+index+']').show().find('td.errorDest').append(div);
    }

    ns.startProcess = function(){
        $('.lockMe').prop('disabled', true);
        $('.hideMe').hide();

        $('#progress').removeClass('progress-bar-danger').addClass('active').attr('valuenow', 0).css('width', '0%').find('.sr-only').text('0% Complete');

        ns.processCommand();
    }

    ns.processEnded = function() {
        $('.lockMe').prop('disabled', false);
        $('.hideMe').show();
        $('#progress').removeClass('active');
    }

    $(function(){
        ns.fileBody = $('#fileBody tbody');

        ns.tourId = require('electron').remote.getGlobal('sharedObject').tour.identifier

        $('#selectFolder').click(function(){
            ns.selectFolder();
        });

        $('#processFolder').click(function(){
            ns.processFolder();
        });

        $('.autoSelect').click(function(){
            var ref = $(this), mode = ref.attr('MODE');
            ns.fileBody.find('input[value='+mode+']').filter(':not([disabled])').prop('checked', true);
        });

        ns.selectFolder();
    });

}());