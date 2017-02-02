var i18next = require('i18next');
var Backend = require('i18next-sync-fs-backend');
 
i18next
  .use(Backend)
  .init({
    lng: 'en',
    ns:'translation',
    initImmediate: false,
    backend: {
    // path where resources get loaded from 
    loadPath: __dirname + '/locales/{{lng}}/{{ns}}.json',
    
    // path to post missing resources 
    addPath: __dirname +  '/locales/{{lng}}/{{ns}}.missing.json',
    
    // jsonIndent to use when storing json files 
    jsonIndent: 2
    }
  });

  $(function(){
      $('[i18n-text]').each(function(){
          var node = $(this), key = node.attr('i18n-text');
          node.text(i18next.t(key));
      });
      $('[i18n-title]').each(function(){
          var node = $(this), key = node.attr('i18n-title');
          node.attr('title', i18next.t(key));
      });
  });