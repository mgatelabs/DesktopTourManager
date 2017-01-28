(function(){

    window.MG = window.MG || {};
    MG.set = MG.set || {};
    var ns = MG.set;

	ns.start = function() {
        // load
        ns.load();
    };
	
	ns.load = function() {
        var data = REST.sync('getSettings', {});
        if (data.code == 'OK') {
            $('#settingPathsTours').val(data.paths.tours);

            $('#settingExpBackground').val(data.expressions.backRegEx);
            $('#settingExpPreview').val(data.expressions.previewRegEx);
        } else {
            MG.common.errorHandler(data);
        }
    };
	
    $(function(){
		ns.start();
        $('#pickToursLocation').click(function(){
            var data = REST.sync('pickToursLocation', {});
            if (data.code == 'OK') {
                $('#settingPathsTours').val(data.dir);
            }
        });
    });
}());