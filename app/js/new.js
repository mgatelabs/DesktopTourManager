(function(){

    window.MG = window.MG || {};
    MG.create = MG.create || {};
    var ns = MG.create;

    MG.common.beforeHandler();

    $(function(){
        $('#createTour').click(function(){
            var tourId = $('#newTourId').val(), tourName = $('#newTourName').val(), result = {code:'OK', msgs:[]};

            if (!tourId) {
                result.msgs.push('Please enter a tour id');
                result.code = 'FAIL';
            } else if (!tourId.match(/^[a-z0-9_]+$/)) {
                result.msgs.push('Invalid tour identifier: must be made up of a-z, 0-9 or _');
                result.code = 'FAIL';
            }

            if (!tourName) {
                result.msgs.push('Please enter a tour name');
                result.code = 'FAIL';
            } else if (!tourName.match(/^\S.*\S$/)) {
                result.msgs.push('Invalid tour name: Cannot start or end with whitespace and must be over 3 characters in length.');
                result.code = 'FAIL';
            }

            if (result.code == 'OK') {
                var result = REST.sync('createTour', {tourId: tourId, tourName: tourName});
                if (result.code == 'OK') {
                    require('electron').remote.getGlobal('sharedObject').tour.identifier = tourId + '.tour';
                    window.location = 'detail.html';
                } else {
                    MG.common.errorHandler(result);
                }
            } else {
                MG.common.errorHandler(result);
            }
        });

        $('#pickSourceLocation').click(function(){
            var data = REST.sync('pickSourceLocation', {});
            if (data.code == 'OK') {
                //ns.load();
            }
        });
        
    });

    

}());