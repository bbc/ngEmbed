function TemplateProviderService(ProviderService, $q) {

    var _service = Object.create(ProviderService);
    _service.getEmbed = function (externalUrl, embedProvider, settings) {
        return function () {
            var deferred = $q.defer();

            if (embedProvider.embedtag.tag !== '') {
                var flashvars = embedProvider.embedtag.flashvars || '';
                var tag = embedProvider.embedtag.tag || 'embed';
                var width = embedProvider.embedtag.width || 'auto';
                var height = embedProvider.embedtag.height || 'auto';
                var src = externalUrl.replace(embedProvider.templateRegex, embedProvider.apiendpoint);

                if (!embedProvider.nocache) {
                    src += '&jqoemcache=' + rand(5);
                }

                if (embedProvider.apikey) {
                    src = src.replace('_APIKEY_', settings.apikeys[embedProvider.name]);
                }

                var code = angular.element('<' + tag + '/>').attr('src', src).attr('width', width)
                    .attr('height', height)
                    .attr('allowfullscreen', embedProvider.embedtag.allowfullscreen || 'true')
                    .attr('allowscriptaccess', embedProvider.embedtag.allowfullscreen || 'always')
                    .css('max-height', settings.maxHeight || 'auto')
                    .css('max-width', settings.maxWidth || 'auto');

                if (tag == 'embed') {
                    code.attr('type', embedProvider.embedtag.type || "application/x-shockwave-flash")
                        .attr('flashvars', externalUrl.replace(embedProvider.templateRegex, flashvars));
                }

                if (tag == 'iframe') {
                    code.attr('scrolling', embedProvider.embedtag.scrolling || "no")
                        .attr('frameborder', embedProvider.embedtag.frameborder || "0");

                }

                deferred.resolve(code[0].outerHTML);
            }
            else if (embedProvider.apiendpoint) {
                //Add APIkey if true
                if (embedProvider.apikey)
                    embedProvider.apiendpoint = embedProvider.apiendpoint.replace('_APIKEY_', settings.apikeys[embedProvider.name]);

                this.$http.jsonp(externalUrl.replace(embedProvider.templateRegex, embedProvider.apiendpoint), {
                    params: {
                        callback: 'JSON_CALLBACK'
                    }
                }).success(function(data) {
                    deferred.resolve(embedProvider.templateData(data));
                }).error(function(e) {
                    deferred.reject(e);
                });
            }
            else {
                var html = externalUrl.replace(embedProvider.templateRegex, embedProvider.template);
                deferred.resolve(html);
            }
            return deferred.promise;
        }.bind(this)();
    };
    return _service;
};


function rand(length, current) { //Found on http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript
    current = current ? current : '';
    return length ? rand(--length, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz".charAt(Math.floor(Math.random() * 60)) + current) : current;
}


app.service('templateProviderService', ['providerService', '$q', TemplateProviderService]);