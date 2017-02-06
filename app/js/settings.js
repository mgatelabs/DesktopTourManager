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

        var settingExpBackground = $('#settingExpBackground').val();
        var settingExpPreview = $('#settingExpPreview').val();
        var settingExpSample = $('#settingExpSample').val();
        var settingPreviewKey = $('#settingPreviewKey').val();

        if (!settingExpBackground) {
            alert(i18next.t('msgs.missingFieldValue', {fieldName: i18next.t('page.settings.regExBack')}));
            return;
        } else if (!settingExpPreview) {
            alert(i18next.t('msgs.missingFieldValue', {fieldName: i18next.t('page.settings.regExPrev')}));
            return;
        } else if (!settingExpSample) {
            alert(i18next.t('msgs.missingFieldValue', {fieldName: i18next.t('page.settings.regExSample')}));
            return;
        } else if (!settingPreviewKey) {
            alert(i18next.t('msgs.missingFieldValue', {fieldName: i18next.t('page.settings.regExPreviewKey')}));
            return;
        }

        if (settingPreviewKey.indexOf('#KEY#') < 0) {
            alert(i18next.t('msgs.missingFieldVar', {fieldName: i18next.t('page.settings.regExPreviewKey'), variable:"#KEY#"}));
            return;
        }

        try {
            var backgroundRegEx = new RegExp(settingExpBackground);
            var previewRegEx = new RegExp(settingExpPreview);

            var name, ext;

            if (settingExpSample.match(ns.extractFileNameString)) {
                var nameMatch =  ns.extractFileNameString.exec(settingExpSample);
                if (nameMatch && nameMatch[1] && nameMatch[2]) {
                    name = nameMatch[1];
                    ext = nameMatch[2].toLowerCase();
                    if (ext == 'jpeg') {
                        ext = 'jpg';
                    }
                }
            } else {
                alert('Could not detect file name.  Invalid sample value.');
                return;
            }

            if (!name) {
                alert(i18next.t('msgs.noFileName'));
                return;
            }

             if (!ext) {
                alert(i18next.t('msgs.noFileExt'));
                return;
            }

            // Make the end file name

            var backgoundName = name + '.jpg', previewName = settingPreviewKey.replace('#KEY#', name) + '.jpg';

            if (backgoundName == previewName) {
                alert(i18next.t('msgs.duplicateNames'));
                return;
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
                alert(i18next.t('msgs.noBackgroundId'));
                return;
            }

            if (!previewId) {
                alert(i18next.t('msgs.noPreviewId'));
                return;
            }

            if (backgroundId != previewId) {
                alert(i18next.t('msgs.keyMismatch', {key1: backgroundId, key2:previewId}));
                return;
            }

            var options = {backRegEx: settingExpBackground, previewRegEx: settingExpPreview, sampleFileName: settingExpSample, previewKey: settingPreviewKey};

            var data = REST.sync('updateRegExSettings', options);
            if (data.code == 'OK') {
            
            }

        } catch (ex) {
            alert(ex);
        }

    };

	ns.load = function() {
        MG.common.beforeHandler();

        var data = REST.sync('getSettings', {});
        if (data.code == 'OK') {
            $('#settingPathsTours').val(data.paths.tours);

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