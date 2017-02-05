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
    };

	ns.start = function() {
        // load
        ns.load();
    };
	
	ns.load = function() {
        MG.common.beforeHandler();

        var data = REST.sync('getSettings', {});
        if (data.code == 'OK') {
            $('#settingPathsTours').val(data.paths.tours);

            $('#settingExpBackground').val(data.expressions.backRegEx);
            $('#settingExpPreview').val(data.expressions.previewRegEx);
        } else {
            MG.common.errorHandler(data);
        }
    };
	
}());