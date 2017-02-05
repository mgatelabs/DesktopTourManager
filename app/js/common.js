(function(){

    window.MG = window.MG || {};
    MG.common = MG.common || {};
    var ns = MG.common;

    ns.beforeHandler = function() {
        $('#errors').empty();
    };

    ns.errorHandler = function(restResponse) {
        var i, errors = $('#errorDialog .modal-body').empty();
        if (restResponse.msgs) {
            for (i = 0; i < restResponse.msgs.length; i++) {
                errors.append($('<div></div>').text(restResponse.msgs[i]));
            }
            $('#errorDialog').modal();
        }
    };

    ns.goto = function(pageLocation){
        $('#wrap').fadeOut(400, function(){
            window.location = pageLocation;
        });
    };

	$(function(){	
		$('#discardButton').click(function(){
			var ref = $(this);
            $('#leaveDialog').modal('hide');
			MG.common.goto(ref.attr('href2'));
		});
	
		$('[href2]').click(function(){
			var ref = $(this);
			if (MG.warn) {
				$('#discardButton').attr('href2', ref.attr('href2'))
				$('#leaveDialog').modal();
				return;
			}
            MG.common.goto(ref.attr('href2'));
		});

        $('.open-in-browser').click(function() {
           event.preventDefault();
           REST.sync('openUrl', {url:$(this).attr('url')});
        });

	});
	
	
}());