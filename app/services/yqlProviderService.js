function YQLServiceProvider(BaseService, $q) {
    function YQLService() {
        BaseService.call(this);
    }
    YQLService.prototype = BaseService;
    YQLService.prototype.getEmbed = function (externalUrl, embedProvider, settings) {
        return function() {
            var deferred = $q.defer();
            var from = embedProvider.yql.from || 'htmlstring';
            var url = embedProvider.yql.url ? embedProvider.yql.url(externalUrl) : externalUrl;
            var query = 'SELECT * FROM ' + from
                + ' WHERE url="' + (url) + '"'
                + " and " + (/html/.test(from) ? 'xpath' : 'itemPath') + "='" + (embedProvider.yql.xpath || '/') + "'";
            if (from == 'html')
                query += " and compat='html5'";

            this.$http.jsonp("//query.yahooapis.com/v1/public/yql", {
                params: {
                    q: query,
                    format: "json",
                    env: 'store://datatables.org/alltableswithkeys',
                    callback: "JSON_CALLBACK"
                }}).success(function (data) {
                var result;

                if (embedProvider.yql.xpath && embedProvider.yql.xpath == '//meta|//title|//link') {
                    var meta = {};

                    if (data.query == null) {
                        data.query = {};
                    }
                    if (data.query.results == null) {
                        data.query.results = {"meta": []};
                    }
                    for (var i = 0, l = data.query.results.meta.length; i < l; i++) {
                        var name = data.query.results.meta[i].name || data.query.results.meta[i].property || null;
                        if (name == null)continue;
                        meta[name.toLowerCase()] = data.query.results.meta[i].content;
                    }
                    if (!meta.hasOwnProperty("title") || !meta.hasOwnProperty("og:title")) {
                        if (data.query.results.title != null) {
                            meta.title = data.query.results.title;
                        }
                    }
                    if (!meta.hasOwnProperty("og:image") && data.query.results.hasOwnProperty("link")) {
                        for (var i = 0, l = data.query.results.link.length; i < l; i++) {
                            if (data.query.results.link[i].hasOwnProperty("rel")) {
                                if (data.query.results.link[i].rel == "apple-touch-icon") {
                                    if (data.query.results.link[i].href.charAt(0) == "/") {
                                        meta["og:image"] = url.match(/^(([a-z]+:)?(\/\/)?[^\/]+\/).*$/)[1] + data.query.results.link[i].href;
                                    } else {
                                        meta["og:image"] = data.query.results.link[i].href;
                                    }
                                }
                            }
                        }
                    }
                    result = embedProvider.yql.datareturn(meta);
                } else {
                    result = embedProvider.yql.datareturn ? embedProvider.yql.datareturn(data.query.results) : data.query.results.result;
                }
                if (result === false)return;
                deferred.resolve(result[0].outerHTML);
            }).error(function (e) {
                deferred.reject(e);
            });

            return deferred.promise;
        }.bind(this)();
    };

    return YQLService;
}





app.service('yqlServiceProvider', ['baseServiceProvider', '$q', YQLServiceProvider]);