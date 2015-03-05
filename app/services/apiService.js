function APIServiceProvider(BaseService, $q) {
    'use strict';

    function APIService() {
        BaseService.call(this);
    }
    APIService.prototype = new BaseService;


    function getRequestUrl(provider, externalUrl) {
        var url = provider.apiendpoint,
            qs = "",
            i;
        url += (url.indexOf("?") <= 0) ? "?" : "&";
        url = url.replace('#', '%23');

        if (provider.maxWidth !== null && (typeof provider.params.maxwidth === 'undefined' || provider.params.maxwidth === null)) {
            provider.params.maxwidth = provider.maxWidth;
        }

        if (provider.maxHeight !== null && (typeof provider.params.maxheight === 'undefined' || provider.params.maxheight === null)) {
            provider.params.maxheight = provider.maxHeight;
        }

        for (i in provider.params) {
            // We don't want them to jack everything up by changing the callback parameter
            if (i == provider.callbackparameter)
                continue;

            // allows the options to be set to null, don't send null values to the server as parameters
            if (provider.params[i] !== null)
                qs += "&" + escape(i) + "=" + provider.params[i];
        }

        url += "format=" + provider.format + "&url=" + escape(externalUrl) + qs;
        if (provider.dataType != 'json')
//            url += "&" + provider.callbackparameter + "=?";

        return url;
    }

    var getPhotoCode = function (url, oembedData) {
        var code;
        var alt = oembedData.title ? oembedData.title : '';
        alt += oembedData.author_name ? ' - ' + oembedData.author_name : '';
        alt += oembedData.provider_name ? ' - ' + oembedData.provider_name : '';

        if (oembedData.html) {
            code = "<div>" + oembedData.html + "</div>";
        }
        else if (oembedData.url) {
            code = '<div><a href="' + url + '" target=\'_blank\'><img src="' + oembedData.url + '" alt="' + alt + '"/></a></div>';
        } else if (oembedData.thumbnail_url) {
            var newURL = oembedData.thumbnail_url.replace('_s', '_b');
            code = '<div><a href="' + url + '" target=\'_blank\'><img src="' + newURL + '" alt="' + alt + '"/></a></div>';
        } else {
            code = '<div>Error loading this picture</div>';
        }



        return code;
    };

    var getRichCode = function (url, oembedData) {
        return oembedData.html;
    };

    var getGenericCode = function (url, oembedData) {
        var title = ((oembedData.title) && (oembedData.title !== null)) ? oembedData.title : url;
        var code = '<a href="' + url + '">' + title + '</a>';

        if (oembedData.html) {
            code += "<div>" + oembedData.html + "</div>";
        }

        return code;
    };


    APIService.prototype.getEmbed = function (externalUrl, embedProvider) {
        return function () {
            var deferred = $q.defer();
            var requestUrl = getRequestUrl(embedProvider, externalUrl);
            var _callbackParamName = embedProvider.callbackparameter || 'callback';
            var params = {};
            params[_callbackParamName] = "JSON_CALLBACK";
            this.$http.jsonp(requestUrl, {
                params: params}).success(function (data) {
                var oembedData = angular.copy(data);
                switch (oembedData.type) {
                    case "file": //Deviant Art has this
                    case "photo":
                        oembedData.code = getPhotoCode(externalUrl, oembedData);
                        break;
                    case "video":
                    case "rich":
                        oembedData.code = getRichCode(externalUrl, oembedData);
                        break;
                    default:
                        oembedData.code = getGenericCode(externalUrl, oembedData);
                        break;
                }
                deferred.resolve(oembedData.code);
            }).error(function(data, status, headers, config) {
                deferred.reject({
                    data: data,
                    status: status,
                    headers: headers,
                    config: config
                });
            });
            return deferred.promise;
        }.bind(this)();
    };
    return new APIService();
}


function rand(length, current) { //Found on http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript
    current = current ? current : '';
    return length ? rand(--length, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz".charAt(Math.floor(Math.random() * 60)) + current) : current;
}


app.factory('apiService', ['baseService', '$q', APIServiceProvider]);