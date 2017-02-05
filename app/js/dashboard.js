(function(){

    window.MG = window.MG || {};
    MG.dash = MG.dash || {};
    var ns = MG.dash;

    ns.init = function() {

        ns.recentList = $('#recentList');
        ns.actionList = $('#actionList');

        $('#newTour').click(function(){
            $('#createButton').click();
        });

        $('#viewTours').click(function(){
            $('#listButton').click();
        });

        $('#modifySettings').click(function(){
            $('#settingsButton').click();
        });
    }

    ns.start = function() {
        ns.load();
    };

    ns.load = function() {
        MG.common.beforeHandler();

        var data = REST.sync('getRecents', {}), i, div, a, newTour = $('#newTour');
        
        if (data.recents.length > 0) {

            newTour.removeClass('btn-primary').addClass('btn-default');

            ns.recentList.find('a.temp').remove();
            ns.actionList.find('a.temp').remove();

            a = $('<a class="btn btn-default btn-lg viewTour temp" href="#" role="button"></a>').attr('title','Edit last modified').text(i18next.t('page.dash.edit', {'file': data.recents[0].display})).attr('tourId', data.recents[0].tourId).insertBefore(newTour);
            a.addClass('btn-primary');
            a.click(function(){
                var ref = $(this);
                require('electron').remote.getGlobal('sharedObject').tour.identifier = ref.attr('tourId');
                MG.common.goto('detail.html');
            });

            for (i = 1; i < data.recents.length; i++) {
                a = $('<a class="btn btn-default btn-lg viewTour temp" href="#" role="button"></a>').text(data.recents[i].display).attr('title', i18next.t('page.dash.edit', {'file': data.recents[i].display})).attr('tourId', data.recents[i].tourId).appendTo(ns.recentList);
            }
            ns.recentList.on('click', 'a.viewTour', function(){
                var ref = $(this);
                require('electron').remote.getGlobal('sharedObject').tour.identifier = ref.attr('tourId');
                MG.common.goto('detail.html');
            });
        }
    };

}());