(function(){

    window.MG = window.MG || {};
    MG.list = MG.list || {};
    var ns = MG.list;

    MG.common.beforeHandler();

    ns.load = function() {
        var data = REST.sync('getRecents', {}), i, list = $('#recentList'), div, a, newTour = $('#newTour');
        
        if (data.recents.length > 0) {

            newTour.removeClass('btn-primary').addClass('btn-default');

            a = $('<a class="btn btn-default btn-lg viewTour" href="#" role="button"></a>').attr('title','Edit last modified').text(i18next.t('page.dash.edit', {'file': data.recents[0].display})).attr('tourId', data.recents[0].tourId).insertBefore(newTour);
            a.addClass('btn-primary');
            a.click(function(){
                var ref = $(this);
                require('electron').remote.getGlobal('sharedObject').tour.identifier = ref.attr('tourId');
                window.location = 'detail.html';
            });

            for (i = 1; i < data.recents.length; i++) {
                a = $('<a class="btn btn-default btn-lg viewTour" href="#" role="button"></a>').text(data.recents[i].display).attr('tourId', data.recents[i].tourId).appendTo(list);
            }
            list.on('click', 'a.viewTour', function(){
                var ref = $(this);
                require('electron').remote.getGlobal('sharedObject').tour.identifier = ref.attr('tourId');
                window.location = 'detail.html';
            });
        }
    };


    $(function(){

        $('#newTour').click(function(){
            window.location = 'new.html';
        });

        $('#viewTours').click(function(){
            window.location = 'list.html';
        });

        $('#modifySettings').click(function(){
            window.location = 'settings.html';
        });

        ns.load();
    });

}());