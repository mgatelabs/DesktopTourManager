(function(){

    $(function() {

        var ns = window.MG;

        for (var key in ns) {
            if (ns.hasOwnProperty(key)) {
                var piece = ns[key];
                if (piece.init) {
                    piece.init();
                }
            }
        }

        ns.dash.start();

        $('[dash-link]').click(function(){
            var link = $(this);
            ns[link.attr('dash-link')].start();
        });

        $('#wrap').fadeIn();

    });

}());