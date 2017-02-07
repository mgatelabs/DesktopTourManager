(function(){

    window.MG = window.MG || {};
    MG.settings = MG.settings || {};
    var ns = MG.settings;

    ns.init = function() {
        $('#pickToursLocation').click(function(){
            var data = REST.sync('pickToursLocation', {});
            if (data.code == 'OK') {
                $('#settingPathsTours').val(data.dir);
            }
        });

        $('#updateRegEx').click(function(){
            ns.updateRegEx();
        });
    };

	ns.start = function() {
        // load
        ns.load();
    };

    ns.updateRegEx = function(){

        var result = {code:'OK', msgs:[]}, i, options, data, backgroundRegEx, previewRegEx, name, ext,
            settingExpBackground = $('#settingExpBackground').val(),
            settingExpPreview = $('#settingExpPreview').val(),
            settingExpSample = $('#settingExpSample').val(),
            settingPreviewKey = $('#settingPreviewKey').val();

        if (!settingExpBackground) {
            result.msgs.push(i18next.t('msgs.missingFieldValue', {fieldName: i18next.t('page.settings.regExBack')}));
        }
        if (!settingExpPreview) {
            result.msgs.push(i18next.t('msgs.missingFieldValue', {fieldName: i18next.t('page.settings.regExPrev')}));
        }
        if (!settingExpSample) {
            result.msgs.push(i18next.t('msgs.missingFieldValue', {fieldName: i18next.t('page.settings.regExSample')}));
        }
        if (!settingPreviewKey) {
            result.msgs.push(i18next.t('msgs.missingFieldValue', {fieldName: i18next.t('page.settings.regExPreviewKey')}));
        }
        if (settingPreviewKey && settingPreviewKey.indexOf('#KEY#') < 0) {
            result.msgs.push(i18next.t('msgs.missingFieldVar', {fieldName: i18next.t('page.settings.regExPreviewKey'), variable:"#KEY#"}));
        }

        if (result.msgs.length == 0) {
            try {
                backgroundRegEx = new RegExp(settingExpBackground);
                previewRegEx = new RegExp(settingExpPreview);

                name = undefined;
                ext = undefined;

                if (settingExpSample.match(ns.extractFileNameString)) {
                    var nameMatch =  ns.extractFileNameString.exec(settingExpSample);
                    if (nameMatch && nameMatch[1] && nameMatch[2]) {
                        name = nameMatch[1];
                        ext = nameMatch[2].toLowerCase();
                        if (ext == 'jpeg') {
                            ext = 'jpg';
                        }
                    }

                    if (!name) {
                        result.msgs.push(i18next.t('msgs.noFileName'));
                    }
                    if (!ext) {
                        result.msgs.push(i18next.t('msgs.noFileExt'));
                    }
                } else {
                    result.msgs.push('Could not detect file name.  Invalid sample value.');
                }

                // Make the end file name

                if (result.msgs.length == 0) {

                    var backgoundName = name + '.jpg', previewName = settingPreviewKey.replace('#KEY#', name) + '.jpg';

                    if (backgoundName == previewName) {
                        result.msgs.push(i18next.t('msgs.duplicateNames'));
                    }

                    var backgroundMatch = backgroundRegEx.exec(backgoundName), backgroundId, previewId;
                    if (backgroundMatch && backgroundMatch[1]) {
                        backgroundId = backgroundMatch[1];
                    }
                
                    backgroundMatch = previewRegEx.exec(previewName);
                    if (backgroundMatch && backgroundMatch[1]) {
                        previewId = backgroundMatch[1];
                    }

                    if (!backgroundId) {
                        result.msgs.push(i18next.t('msgs.noBackgroundId'));
                    }

                    if (!previewId) {
                        result.msgs.push(i18next.t('msgs.noPreviewId'));
                    }

                    if (backgroundId != previewId) {
                        result.msgs.push(i18next.t('msgs.keyMismatch', {key1: backgroundId, key2:previewId}));
                    }

                    if (result.msgs.length == 0) {
                        options = {backRegEx: settingExpBackground, previewRegEx: settingExpPreview, sampleFileName: settingExpSample, previewKey: settingPreviewKey};
                        data = REST.sync('updateRegExSettings', options);
                        if (data.code != 'OK') {
                            result.code = data.code;
                            for (i = 0; i < data.msgs.length; i++) {
                                result.msgs.push(data.msgs[i]);
                            }
                        }
                    }
                }
            } catch (ex) {
                result.msgs.push(ex);
            }
        }

        if (result.code != 'OK' || result.msgs.length > 0) {
            MG.common.errorHandler(result);
        }
    };

	ns.load = function() {
        MG.common.beforeHandler();

        var data = REST.sync('getSettings', {});
        if (data.code == 'OK') {
            $('#settingPathsTours').val(data.paths.tours);
            $('#settingPathsSettings').val(data.paths.settings);

            ns.extractFileNameString = new RegExp(data.expressions.extractFileNameString);

            $('#settingExpBackground').val(data.expressions.backRegEx);
            $('#settingExpPreview').val(data.expressions.previewRegEx);
            $('#settingExpSample').val(data.expressions.sampleFileName);
            $('#settingPreviewKey').val(data.expressions.previewKey);
        } else {
            MG.common.errorHandler(data);
        }
    };
	
}());