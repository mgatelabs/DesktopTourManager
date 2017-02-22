(function(){

    window.MG = window.MG || {};
    MG.list = MG.list || {};
    var ns = MG.list;

    ns.init = function() {
        // anchors
        ns.listBody = $('#listTable tbody');

        ns.listBody.on('click', 'tr td button[mode]', function(){
            var ref = $(this), index = ref.attr('index') - 0, mode = ref.attr('mode');
            switch (mode) {
                case 'EDIT': {
                    require('electron').remote.getGlobal('sharedObject').tour.identifier = ref.attr('identifier');
                    MG.common.goto('detail.html');
                } break;
                case 'ZIP': {
                    var i = ref.attr('index'), identifier = ref.attr('identifier');
                    REST.async('zipTour', {tourId: identifier}, function(result){

                    });
                } break;
                case 'DELETE': {
                    var i = ref.attr('index'), identifier = ref.attr('identifier');
                    if (confirm('Delete tour: ' + identifier + ', are you sure?')) {
                        MG.common.beforeHandler();
						var data = REST.sync('deleteTour', {tourId: identifier});
						if (data.code == 'OK') {
							$('tr[i='+i+']').remove();
						} else {
							MG.common.errorHandler(data);
						}
                    }
                } break;
            }
        });
    }

    ns.start = function() {
        // load
        ns.load(); 
    };    

    ns.load = function() {
        MG.common.beforeHandler();

        var data = REST.sync('getTours', {});

        ns.listBody.empty();
        var item, tr, td, i = 0, link, rnd = new Date().getTime();

        if (data.code == 'OK') {
            for (i = 0; i < data.items.length; i++) {
                item = data.items[i];
                tr = $('<tr></tr>').attr('i', i).appendTo( ns.listBody);
                td = $('<td></td>').appendTo(tr);
                
                link = $('<button type="button" style="margin-right:4px;" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-pencil" aria-hidden="true"></span></button>').attr('index', i).attr('mode', 'EDIT').appendTo(td);
                link.attr('identifier', item.identifier);
                link.attr('title', i18next.t('page.list.edit', {'name': item.name}));

                //$('<td></td>').text(item.name).appendTo(tr);
                $('<td></td>').text(item.identifier).appendTo(tr);

                td = $('<td></td>').appendTo(tr);

                link = $('<button type="button" style="margin-right:4px;" class="btn btn-info btn-xs"><span class="glyphicon glyphicon-compressed" aria-hidden="true"></span></button>').attr('index', i).attr('mode', 'ZIP').appendTo(td);
                link.attr('identifier', item.identifier);
                link.attr('title', i18next.t('page.list.zip', {'name': item.name}));

                td = $('<td></td>').appendTo(tr);

                link = $('<button type="button" style="margin-right:4px;" class="btn btn-danger btn-xs"><span class="glyphicon glyphicon-trash" aria-hidden="true"></span></button>').attr('index', i).attr('mode', 'DELETE').appendTo(td);
                link.attr('identifier', item.identifier);
                link.attr('title', i18next.t('page.list.delete', {'name': item.name}));
            }
        } else {
            MG.common.errorHandler(data);
        }
        
    };

}());