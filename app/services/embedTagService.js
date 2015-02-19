function EmbedTagServiceProvider(BaseService, $q) {
    'use strict';

    function EmbedTagService() {
        BaseService.apply(this, arguments);
    }
    EmbedTagService.prototype = BaseService;
    EmbedTagService.prototype.getEmbed = function (externalUrl, embedProvider, settings) {
        return function () {
            var deferred = $q.defer();
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
            return deferred.promise;
        }.bind(this)();
    };
    return new EmbedTagService();
}

app.service('embedTagService', ['baseService', '$q', EmbedTagServiceProvider]);