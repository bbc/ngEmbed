function oEmbedProviderProvider() {
    'use strict';

    function oEmbedProvider(name, type, urlschemesarray, apiendpoint, extraSettings) {
        this.name = name;
        this.type = type; // "photo", "video", "link", "rich", null
        this.urlschemes = urlschemesarray;
        this.apiendpoint = apiendpoint;
        this.maxWidth = 500;
        this.maxHeight = 400;
        extraSettings = extraSettings || {};

        if (extraSettings.useYQL) {

            if (extraSettings.useYQL == 'xml') {
                extraSettings.yql = {
                    xpath: "//oembed/html",
                    from: 'xml',
                    apiendpoint: this.apiendpoint,
                    url: function (externalurl) {
                        return this.apiendpoint + '?format=xml&url=' + externalurl
                    },
                    datareturn: function (results) {
                        return results.html.replace(/.*\[CDATA\[(.*)\]\]>$/, '$1') || ''
                    }
                };
            } else {
                extraSettings.yql = {
                    from: 'json',
                    apiendpoint: this.apiendpoint,
                    url: function (externalurl) {
                        return this.apiendpoint + '?format=json&url=' + externalurl
                    },
                    datareturn: function (results) {
                        if (results.json.type != 'video' && (results.json.url || results.json.thumbnail_url)) {
                            return '<img src="' + (results.json.url || results.json.thumbnail_url) + '" />';
                        }
                        return results.json.html || ''
                    }
                };
            }
            this.apiendpoint = null;
        }


        for (var property in extraSettings) {
            this[property] = extraSettings[property];
        }

        this.format = this.format || 'json';
        this.callbackparameter = this.callbackparameter || "callback";
        this.embedtag = this.embedtag || {tag: ""};
    }

    return oEmbedProvider;
}



app.factory('oEmbedProvider', [oEmbedProviderProvider]);