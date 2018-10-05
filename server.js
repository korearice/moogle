var cheerio = require('cheerio'),
        request = require('request'),
        Promise = require('bluebird'),
        express = require('express'),
        morgan = require('morgan'),
        handlebars = require("node-handlebars"),
        app = express();

app.use(morgan('dev'));
app.use(express.static(__dirname + '/public'));
app.set('port', process.env.PORT || 8080);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('events').EventEmitter.prototype._maxListeners = 100;

var hbs = handlebars.create({
        partialsDir :__dirname
});

app.get('/', function(req, res, next){
        res.sendFile(__dirname+'/public/index.html');
})

var getSearchResults = function(params){
        return new Promise(function(resolve, reject){
                request({url : 'https://www.google.com' + params, encoding : 'utf-8'}, function(err, res, body){
                        if(err){
                                console.log(err);
                        } else{
                                resolve(body);
                        }
                });
        });
}

var getValidatedMarkup = function(body){
        var $ = cheerio.load(body);
        $('body img').each(function(){
      var _this = $(this);
          var src = _this.attr('src');
          var REG_YOUTUBE = /youtube/gi;
          var REG_GOOGLE_MAP = /^\/map/gi;
          if(REG_YOUTUBE.test(src)){
              _this.attr('src', 'img/logo_youtube.png');
          } else if(REG_GOOGLE_MAP.test(src)){
              _this.attr('src', 'img/logo_google_map.png');
              //_this.attr('src', '/proxy?url=https://www.google.co.uk' + src);
          } else{
              _this.attr('src', '/proxy?url=' + src);
          }
        });
        $('#center_col a').each(function(){
      var _this = $(this);
          var href = _this.attr('href');
          var REG_OUTLINK = /http/gi;
          if(REG_OUTLINK.test(href)){
              href = href.replace("/url?q=", "").split("&")[0];
                  _this.attr('href', decodeURIComponent(href));
                  _this.attr('target', '_blank');
          }
        });
        return $;
}

app.get('/search', function(req, res, next){
        return new Promise(function(resolve, reject){
                var params = req.originalUrl;
                getSearchResults(params)
                .then(function(body){
console.log(body);
                        hbs.engine(__dirname + "/public/search.html", { query : req.query.q }, function(err, template){
                                if(err) {
                                        throw err;
                                }
                                var $g = getValidatedMarkup(body);
                                var $t = cheerio.load(template);
                                $t('#content').append($g('#center_col').html() + '<div class=\"pagination\">' + $g('#foot > table').html() + '<\/div>');
                                res.send($t.html());
                        });
                });
        });
})

app.get('/proxy', function(req, res, next){
        return new Promise(function(resolve, reject){
                var url = req.query.url;
                request(url).pipe(res);
        });
})

app.listen(app.get('port'), function(){
        console.log('Express server listening at port '+app.get('port'));
})
