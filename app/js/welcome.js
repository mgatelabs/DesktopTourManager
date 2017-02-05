(function(){

    window.MG = window.MG || {};
    MG.list = MG.list || {};
    var ns = MG.list;

    $(function(){
        $('#pickToursLocation').click(function(){
            var data = REST.sync('pickToursLocation', {});
            if (data.code == 'OK') {
                window.location = 'dashboard.html';
            }
        });
    });

}());