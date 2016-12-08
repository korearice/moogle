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

var requestToSearchEngine = function(params){
	return new Promise(function(resolve, reject){
		request('http://www.google.com' + params, function(err, res, body){
			if(err){
				console.log(err);
			} else{
				resolve(body);
			}
		})
	});
}

app.get('/search', function(req, res, next){
	return new Promise(function(resolve, reject){
		var params = req.originalUrl;
		requestToSearchEngine(params)
		.then(function(body){
			var $ = cheerio.load(body);
			hbs.engine(__dirname + "/public/search.html", { query : req.query.q }, function(err, html){
				if(err) {
					throw err;
				}
				$('body img').each(function(){
				  var src = $(this).attr('src');
				  $(this).attr('src', '/image?url=' + src);
				});
				$('#center_col a').each(function(){
				  var href = $(this).attr('href');
				  var REG_OUTLINK = /http/gi;
				  if(REG_OUTLINK.test(href)){
				      href = href.replace("/url?q=", "").split("&")[0];
    				  $(this).attr('href', href);
    				  $(this).attr('target', '_blank');
				  }
				});
				var page = html.replace('<!-- ContentArea -->', $('#center_col').html() + '<div class=\"pagination\">' + $('#foot > table').html() + '<\/div>');
				res.send(page);
			});
		});
	});
})

app.get('/image', function(req, res, next){
	return new Promise(function(resolve, reject){
		var url = req.query.url;
		request(url).pipe(res);
	});
})

app.listen(app.get('port'), function(){
	console.log('Express server listening at port '+app.get('port'));
})