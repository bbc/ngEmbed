function TemplateServiceProvider(BaseService, $q) {
    'use strict';

    function TemplateService() {
        BaseService.call(this);
    }

    TemplateService.prototype = new BaseService;
    TemplateService.prototype.getEmbed = function (externalUrl, embedProvider, settings) {
        return function () {
            var deferred = $q.defer();
            if (embedProvider.apiendpoint) {
                //Add APIkey if true
                if (embedProvider.apikey)
                    embedProvider.apiendpoint = embedProvider.apiendpoint.replace('_APIKEY_', settings.apikeys[embedProvider.name]);

                this.$http.jsonp(externalUrl.replace(embedProvider.templateRegex, embedProvider.apiendpoint), {
                    params: {
                        callback: 'JSON_CALLBACK'
                    }
                }).then(function (data) {

                    deferred.resolve(embedProvider.templateData(data));
                }).catch(function (data, status, headers, config) {
                    deferred.reject({
                        data: data,
                        status: status,
                        headers: headers,
                        config: config
                    });
                });
            }
            else {
                var html = externalUrl.replace(embedProvider.templateRegex, embedProvider.template);
                deferred.resolve(html);
            }
            return deferred.promise;
        }.bind(this)();
    };
    return new TemplateService();
}


function rand(length, current) { //Found on http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript
    current = current ? current : '';
    return length ? rand(--length, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz".charAt(Math.floor(Math.random() * 60)) + current) : current;
}


app.factory('templateService', ['baseService', '$q', TemplateServiceProvider]);