/***********Polyfill bind function for PhantomJS********/
if (!Function.prototype.bind) {
    Function.prototype.bind = function(oThis) {
        if (typeof this !== 'function') {
            // closest thing possible to the ECMAScript 5
            // internal IsCallable function
            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
        }

        var aArgs   = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP    = function() {},
            fBound  = function() {
                return fToBind.apply(this instanceof fNOP && oThis
                        ? this
                        : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        return fBound;
    };
}


var app = angular.module('ngEmbed', []);

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
function ngEmbedController($scope, oEmbedProviderService, longifyService) {
    'use strict';

    $scope.internalModel = {};
    $scope.embedUrl = '';
    $scope.embedHTML = '';

    function getNormalizedParams(params) {
        if (params === null) return null;
        var key, normalizedParams = {};
        for (key in params) {
            if (key !== null) normalizedParams[key.toLowerCase()] = params[key];
        }
        return normalizedParams;
    }

    $scope.$watch('embedUrl', function (newValue) {
        if (newValue) {
            $scope.internalModel.originalUrl = newValue;
            longifyService.longify(newValue, $scope.settings).then(function (longUrl) {
                $scope.provider = oEmbedProviderService.getOEmbedProvider(longUrl);
                if ($scope.settings.fallback === false) {
                    $scope.provider = $scope.provider.name.toLowerCase() === 'opengraph' ? null : $scope.provider;
                }

                if($scope.provider) {
                    $scope.provider.params = getNormalizedParams($scope.settings[$scope.provider.name]) || {};

                    if ($scope.settings.onbeforeembed || $scope.provider.params.onbeforeembed) {
                        var callback = $scope.settings.onbeforeembed || $scope.provider.params.onbeforeembed;
                        if (callback.call(this, longUrl, $scope.provider) === false) {
                            return;
                        }
                    }

                    oEmbedProviderService.getEmbedHTML(longUrl, $scope.provider, $scope.settings).then(function (html) {
                        $scope.embedHTML = html;
                        $scope.internalModel.longUrl = longUrl;
                        $scope.internalModel.provider = $scope.provider;
                        $scope.internalModel.html = html;
                    }, function(params) {
                        if($scope.settings.onerror || $scope.provider.params.onerror) {
                            var callback = $scope.settings.onerror || $scope.provider.params.onerror;
                            callback.call(this, params);
                        }
                    });
                }
                else {
                    if ($scope.settings.onnotsupported) {
                        $scope.settings.onnotsupported.call(this, longUrl);
                    }
                }
            });
        }
    });

}

function ngEmbed() {
    'use strict';

    return {
        scope: {
            settings: '='
        },
        restrict: 'EA',
        require: '?ngModel',
        controller: 'ngEmbedController',
        link: function (scope, element, attr, ngModel) {
            attr.$observe('embedUrl', function (value) {
                scope.embedUrl = value;
            });
            scope.$watch('embedHTML', function (newValue) {
                if (newValue) {
                    element.html(newValue);
                }
            });

            scope.$watch('internalModel', function (newValue) {
                if (newValue && ngModel) {
                    ngModel.$setViewValue(newValue);
                }
            });
        }
    }
}

app.controller('ngEmbedController', ['$scope', 'oEmbedProviderService', 'longifyService', ngEmbedController]);
app.directive('ngEmbed', [ngEmbed]);



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
                params: params}).then(function (data) {
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
            }).catch(function(data, status, headers, config) {
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
function BaseServiceProvider($http) {
    'use strict';

    function BaseService() {
        this.$http = $http;
    }
    BaseService.prototype.getEmbed = function() {};

    return BaseService;
}

app.service('baseService', ['$http', BaseServiceProvider]);
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
function LongifyServiceProvider(BaseService, $q) {
    'use strict';

    function LongifyService() {
        BaseService.call(this);
    }
    LongifyService.prototype = BaseService;

    var shortURLList = ["0rz.tw", "1link.in", "1url.com", "2.gp", "2big.at", "2tu.us", "3.ly", "307.to", "4ms.me", "4sq.com", "4url.cc", "6url.com", "7.ly", "a.gg", "a.nf", "aa.cx", "abcurl.net",
        "ad.vu", "adf.ly", "adjix.com", "afx.cc", "all.fuseurl.com", "alturl.com", "amzn.to", "ar.gy", "arst.ch", "atu.ca", "azc.cc", "b23.ru", "b2l.me", "bacn.me", "bcool.bz", "binged.it",
        "bit.ly", "bizj.us", "bloat.me", "bravo.ly", "bsa.ly", "budurl.com", "canurl.com", "chilp.it", "chzb.gr", "cl.lk", "cl.ly", "clck.ru", "cli.gs", "cliccami.info",
        "clickthru.ca", "clop.in", "conta.cc", "cort.as", "cot.ag", "crks.me", "ctvr.us", "cutt.us", "dai.ly", "decenturl.com", "dfl8.me", "digbig.com",
        "http:\/\/digg\.com\/[^\/]+$", "disq.us", "dld.bz", "dlvr.it", "do.my", "doiop.com", "dopen.us", "easyuri.com", "easyurl.net", "eepurl.com", "eweri.com",
        "fa.by", "fav.me", "fb.me", "fbshare.me", "ff.im", "fff.to", "fire.to", "firsturl.de", "firsturl.net", "flic.kr", "flq.us", "fly2.ws", "fon.gs", "freak.to",
        "fuseurl.com", "fuzzy.to", "fwd4.me", "fwib.net", "g.ro.lt", "gizmo.do", "gl.am", "go.9nl.com", "go.ign.com", "go.usa.gov", "goo.gl", "goshrink.com", "gurl.es",
        "hex.io", "hiderefer.com", "hmm.ph", "href.in", "hsblinks.com", "htxt.it", "huff.to", "hulu.com", "hurl.me", "hurl.ws", "icanhaz.com", "idek.net", "ilix.in", "is.gd",
        "its.my", "ix.lt", "j.mp", "jijr.com", "kl.am", "klck.me", "korta.nu", "krunchd.com", "l9k.net", "lat.ms", "liip.to", "liltext.com", "linkbee.com", "linkbun.ch",
        "liurl.cn", "ln-s.net", "ln-s.ru", "lnk.gd", "lnk.ms", "lnkd.in", "lnkurl.com", "lru.jp", "lt.tl", "lurl.no", "macte.ch", "mash.to", "merky.de", "migre.me", "miniurl.com",
        "minurl.fr", "mke.me", "moby.to", "moourl.com", "mrte.ch", "myloc.me", "myurl.in", "n.pr", "nbc.co", "nblo.gs", "nn.nf", "not.my", "notlong.com", "nsfw.in",
        "nutshellurl.com", "nxy.in", "nyti.ms", "o-x.fr", "oc1.us", "om.ly", "omf.gd", "omoikane.net", "on.cnn.com", "on.mktw.net", "onforb.es", "orz.se", "ow.ly", "ping.fm",
        "pli.gs", "pnt.me", "politi.co", "post.ly", "pp.gg", "profile.to", "ptiturl.com", "pub.vitrue.com", "qlnk.net", "qte.me", "qu.tc", "qy.fi", "r.ebay.com", "r.im", "rb6.me", "read.bi",
        "readthis.ca", "reallytinyurl.com", "redir.ec", "redirects.ca", "redirx.com", "retwt.me", "ri.ms", "rickroll.it", "riz.gd", "rt.nu", "ru.ly", "rubyurl.com", "rurl.org",
        "rww.tw", "s4c.in", "s7y.us", "safe.mn", "sameurl.com", "sdut.us", "shar.es", "shink.de", "shorl.com", "short.ie", "short.to", "shortlinks.co.uk", "shorturl.com",
        "shout.to", "show.my", "shrinkify.com", "shrinkr.com", "shrt.fr", "shrt.st", "shrten.com", "shrunkin.com", "simurl.com", "slate.me", "smallr.com", "smsh.me", "smurl.name",
        "sn.im", "snipr.com", "snipurl.com", "snurl.com", "sp2.ro", "spedr.com", "srnk.net", "srs.li", "starturl.com", "stks.co", "su.pr", "surl.co.uk", "surl.hu", "t.cn", "t.co", "t.lh.com",
        "ta.gd", "tbd.ly", "tcrn.ch", "tgr.me", "tgr.ph", "tighturl.com", "tiniuri.com", "tiny.cc", "tiny.ly", "tiny.pl", "tinylink.in", "tinyuri.ca", "tinyurl.com", "tk.", "tl.gd",
        "tmi.me", "tnij.org", "tnw.to", "tny.com", "to.ly", "togoto.us", "totc.us", "toysr.us", "tpm.ly", "tr.im", "tra.kz", "trunc.it", "twhub.com", "twirl.at",
        "twitclicks.com", "twitterurl.net", "twitterurl.org", "twiturl.de", "twurl.cc", "twurl.nl", "u.mavrev.com", "u.nu", "u76.org", "ub0.cc", "ulu.lu", "updating.me", "ur1.ca",
        "url.az", "url.co.uk", "url.ie", "url360.me", "url4.eu", "urlborg.com", "urlbrief.com", "urlcover.com", "urlcut.com", "urlenco.de", "urli.nl", "urls.im",
        "urlshorteningservicefortwitter.com", "urlx.ie", "urlzen.com", "usat.ly", "use.my", "vb.ly", "vevo.ly", "vgn.am", "vl.am", "vm.lc", "w55.de", "wapo.st", "wapurl.co.uk", "wipi.es",
        "wp.me", "x.vu", "xr.com", "xrl.in", "xrl.us", "xurl.es", "xurl.jp", "y.ahoo.it", "yatuc.com", "ye.pe", "yep.it", "yfrog.com", "yhoo.it", "yiyd.com", "youtu.be", "yuarel.com",
        "z0p.de", "zi.ma", "zi.mu", "zipmyurl.com", "zud.me", "zurl.ws", "zz.gd", "zzang.kr", "›.ws", "✩.ws", "✿.ws", "❥.ws", "➔.ws", "➞.ws", "➡.ws", "➨.ws", "➯.ws", "➹.ws", "➽.ws"];


    LongifyService.prototype.longify = function (resourceURL, settings) {

        return function () {
            var defer = $q.defer();
            var match = false;
            //Check if shorten URL

            for (var j = 0, l = shortURLList.length; j < l; j++) {
                var regExp = new RegExp('://' + shortURLList[j] + '/', "i");

                if (resourceURL.match(regExp) !== null) {
                    match = true;
                    //AJAX to http://api.longurl.org/v2/expand?url=http://bit.ly/JATvIs&format=json&callback=hhh

                    if(settings.longify && settings.longify.useCustomService) {
                        return settings.longify.useCustomService.call(this, resourceURL, defer);
                    }
                    else {
                        this.$http.jsonp('http://api.longurl.org/v2/expand', {
                            params: {
                                callback: "JSON_CALLBACK",
                                url: resourceURL,
                                format: "json"
                            }
                        }).then(function (data) {
                            defer.resolve(data['long-url']);
                        }).catch(function (data, status, headers, config) {
                            defer.reject({
                                data: data,
                                status: status,
                                headers: headers,
                                config: config
                            });
                        });
                    }
                }
            }

            if (!match) {
                defer.resolve(resourceURL);
            }
            return defer.promise;
        }.bind(this)();
    };


    return new LongifyService();
}

app.service('longifyService', ['baseService', '$q', LongifyServiceProvider]);
function oEmbedProviderService(templateProviderService, yqlProviderService, apiProviderService, embedTagService, oEmbedProvider) {
    'use strict';

    var facebookScriptHasBeenAdded;
    var settings = {};
    var providers = [

        //Video
        new oEmbedProvider("youtube", "video", ["youtube\\.com/watch.+v=[\\w-]+&?", "youtu\\.be/[\\w-]+", "youtube.com/embed"], 'https://www.youtube.com/embed/$1?wmode=transparent', {
            templateRegex: /.*(?:v\=|be\/|embed\/)([\w\-]+)&?.*/, embedtag: {tag: 'iframe', width: '425', height: '349'}
        }),
        new oEmbedProvider("youtube", "video", ["youtube.com/playlist"], 'https://www.youtube.com/embed/playlist?list=$1&wmode=transparent', {
            templateRegex: /.*(?:list\=|be\/|embed\/)([\w\-]+)&?.*/, embedtag: {tag: 'iframe', width: '425', height: '349'}
        }),

        //new oEmbedProvider("youtube", "video", ["youtube\\.com/watch.+v=[\\w-]+&?", "youtu\\.be/[\\w-]+"], 'http://www.youtube.com/oembed', {useYQL:'json'}),
        //new oEmbedProvider("youtubeiframe", "video", ["youtube.com/embed"],  "$1?wmode=transparent",
        //  {templateRegex:/(.*)/,embedtag : {tag: 'iframe', width:'425',height: '349'}}),
        new oEmbedProvider("wistia", "video", ["wistia.com/m/.+", "wistia.com/embed/.+", "wi.st/m/.+", "wi.st/embed/.+"], 'http://fast.wistia.com/oembed', {useYQL: 'json'}),
        new oEmbedProvider("xtranormal", "video", ["xtranormal\\.com/watch/.+"], "http://www.xtranormal.com/xtraplayr/$1/$2", {
            templateRegex: /.*com\/watch\/([\w\-]+)\/([\w\-]+).*/, embedtag: {tag: 'iframe', width: '320', height: '269'}}),
        new oEmbedProvider("scivee", "video", ["scivee.tv/node/.+"], "http://www.scivee.tv/flash/embedCast.swf?", {
            templateRegex: /.*tv\/node\/(.+)/, embedtag: {width: '480', height: '400', flashvars: "id=$1&type=3"}}),
        new oEmbedProvider("veoh", "video", ["veoh.com/watch/.+"], "http://www.veoh.com/swf/webplayer/WebPlayer.swf?version=AFrontend.5.7.0.1337&permalinkId=$1&player=videodetailsembedded&videoAutoPlay=0&id=anonymous", {
            templateRegex: /.*watch\/([^\?]+).*/, embedtag: {width: '410', height: '341'}}),
        new oEmbedProvider("gametrailers", "video", ["gametrailers\\.com/video/.+"], "http://media.mtvnservices.com/mgid:moses:video:gametrailers.com:$2", {
            templateRegex: /.*com\/video\/([\w\-]+)\/([\w\-]+).*/, embedtag: {width: '512', height: '288' }}),
        new oEmbedProvider("funnyordie", "video", ["funnyordie\\.com/videos/.+"], "http://player.ordienetworks.com/flash/fodplayer.swf?", {
            templateRegex: /.*videos\/([^\/]+)\/([^\/]+)?/, embedtag: {width: 512, height: 328, flashvars: "key=$1"}}),
        new oEmbedProvider("collegehumour", "video", ["collegehumor\\.com/video/.+"], "http://www.collegehumor.com/moogaloop/moogaloop.swf?clip_id=$1&use_node_id=true&fullscreen=1",
            {templateRegex: /.*video\/([^\/]+).*/, embedtag: {width: 600, height: 338}}),
        new oEmbedProvider("metacafe", "video", ["metacafe\\.com/watch/.+"], "http://www.metacafe.com/fplayer/$1/$2.swf",
            {templateRegex: /.*watch\/(\d+)\/(\w+)\/.*/, embedtag: {width: 400, height: 345}}),
        new oEmbedProvider("bambuser", "video", ["bambuser\\.com\/channel\/.*\/broadcast\/.*"], "http://static.bambuser.com/r/player.swf?vid=$1",
            {templateRegex: /.*bambuser\.com\/channel\/.*\/broadcast\/(\w+).*/, embedtag: {width: 512, height: 339 }}),
        new oEmbedProvider("twitvid", "video", ["twitvid\\.com/.+"], "http://www.twitvid.com/embed.php?guid=$1&autoplay=0",
            {templateRegex: /.*twitvid\.com\/(\w+).*/, embedtag: {tag: 'iframe', width: 480, height: 360 }}),
        new oEmbedProvider("aniboom", "video", ["aniboom\\.com/animation-video/.+"], "http://api.aniboom.com/e/$1",
            {templateRegex: /.*animation-video\/(\d+).*/, embedtag: {width: 594, height: 334}}),
        new oEmbedProvider("vzaar", "video", ["vzaar\\.com/videos/.+", "vzaar.tv/.+"], "http://view.vzaar.com/$1/player?",
            {templateRegex: /.*\/(\d+).*/, embedtag: {tag: 'iframe', width: 576, height: 324 }}),
        new oEmbedProvider("snotr", "video", ["snotr\\.com/video/.+"], "http://www.snotr.com/embed/$1",
            {templateRegex: /.*\/(\d+).*/, embedtag: {tag: 'iframe', width: 400, height: 330}, nocache: 1 }),
        new oEmbedProvider("youku", "video", ["v.youku.com/v_show/id_.+"], "http://player.youku.com/player.php/sid/$1/v.swf",
            {templateRegex: /.*id_(.+)\.html.*/, embedtag: {width: 480, height: 400}, nocache: 1 }),
        new oEmbedProvider("tudou", "video", ["tudou.com/programs/view/.+\/"], "http://www.tudou.com/v/$1/v.swf",
            {templateRegex: /.*view\/(.+)\//, embedtag: {width: 480, height: 400}, nocache: 1 }),
        new oEmbedProvider("embedr", "video", ["embedr\\.com/playlist/.+"], "http://embedr.com/swf/slider/$1/425/520/default/false/std?",
            {templateRegex: /.*playlist\/([^\/]+).*/, embedtag: {width: 425, height: 520}}),
        new oEmbedProvider("blip", "video", ["blip\\.tv/.+"], "https://blip.tv/oembed/"),
        new oEmbedProvider("minoto-video", "video", ["http://api.minoto-video.com/publishers/.+/videos/.+", "http://dashboard.minoto-video.com/main/video/details/.+", "http://embed.minoto-video.com/.+"], "http://api.minoto-video.com/services/oembed.json", {useYQL: 'json'}),
        new oEmbedProvider("animoto", "video", ["animoto.com/play/.+"], "http://animoto.com/services/oembed"),
        new oEmbedProvider("hulu", "video", ["hulu\\.com/watch/.*"], "https://www.hulu.com/api/oembed.json"),
        new oEmbedProvider("ustream", "video", ["ustream\\.tv/recorded/.*"], "http://www.ustream.tv/oembed", {useYQL: 'json'}),
        new oEmbedProvider("videojug", "video", ["videojug\\.com/(film|payer|interview).*"], "http://www.videojug.com/oembed.json", {useYQL: 'json'}),
        new oEmbedProvider("sapo", "video", ["videos\\.sapo\\.pt/.*"], "http://videos.sapo.pt/oembed", {useYQL: 'json'}),
        new oEmbedProvider("vodpod", "video", ["vodpod.com/watch/.*"], "http://vodpod.com/oembed.js", {useYQL: 'json'}),
        new oEmbedProvider("vimeo", "video", ["www\.vimeo\.com\/groups\/.*\/videos\/.*", "www\.vimeo\.com\/.*", "vimeo\.com\/groups\/.*\/videos\/.*", "vimeo\.com\/.*"], "https:////vimeo.com/api/oembed.json"),
        new oEmbedProvider("dailymotion", "video", ["dailymotion\\.com/.+"], '//www.dailymotion.com/services/oembed'),
        new oEmbedProvider("5min", "video", ["www\\.5min\\.com/.+"], 'http://api.5min.com/oembed.xml', {useYQL: 'xml'}),
        new oEmbedProvider("National Film Board of Canada", "video", ["nfb\\.ca/film/.+"], 'http://www.nfb.ca/remote/services/oembed/', {useYQL: 'json'}),
        new oEmbedProvider("qik", "video", ["qik\\.com/\\w+"], 'http://qik.com/api/oembed.json', {useYQL: 'json'}),
        new oEmbedProvider("revision3", "video", ["revision3\\.com"], "http://revision3.com/api/oembed/"),
        new oEmbedProvider("dotsub", "video", ["dotsub\\.com/view/.+"], "http://dotsub.com/services/oembed", {useYQL: 'json'}),
        new oEmbedProvider("clikthrough", "video", ["clikthrough\\.com/theater/video/\\d+"], "http://clikthrough.com/services/oembed"),
        new oEmbedProvider("Kinomap", "video", ["kinomap\\.com/.+"], "http://www.kinomap.com/oembed"),
        new oEmbedProvider("VHX", "video", ["vhx.tv/.+"], "http://vhx.tv/services/oembed.json"),
        new oEmbedProvider("bambuser", "video", ["bambuser.com/.+"], "http://api.bambuser.com/oembed/iframe.json"),
        new oEmbedProvider("justin.tv", "video", ["justin.tv/.+"], 'http://api.justin.tv/api/embed/from_url.json', {useYQL: 'json'}),
        new oEmbedProvider("vine", "video", ["vine.co/v/.*"], null,
            {
                templateRegex: /https?:\/\/w?w?w?.?vine\.co\/v\/([a-zA-Z0-9]*).*/,
                template: '<iframe src="https://vine.co/v/$1/embed/simple" width="600" height="600" allowfullscreen="true" allowscriptaccess="always" scrolling="no" frameborder="0"></iframe>',
                nocache: 1
            }),
        new oEmbedProvider("boxofficebuz", "video", ["boxofficebuz\\.com\\/embed/.+"], "http://boxofficebuz.com/embed/$1/$2", {templateRegex: [/.*boxofficebuz\.com\/embed\/(\w+)\/([\w*\-*]+)/], embedtag: {tag: 'iframe', width: 480, height: 360 }}),
        new oEmbedProvider("clipsyndicate", "video", ["clipsyndicate\\.com/video/play/.+", "clipsyndicate\\.com/embed/iframe\?.+"], "http://eplayer.clipsyndicate.com/embed/iframe?pf_id=1&show_title=0&va_id=$1&windows=1", {templateRegex: [/.*www\.clipsyndicate\.com\/video\/play\/(\w+)\/.*/, /.*eplayer\.clipsyndicate\.com\/embed\/iframe\?.*va_id=(\w+).*.*/], embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),
        new oEmbedProvider("coub", "video", ["coub\\.com/.+"], "http://www.coub.com/embed/$1?muted=false&autostart=false&originalSize=false&hideTopBar=false&noSiteButtons=false&startWithHD=false", {templateRegex: [/.*coub\.com\/embed\/(\w+)\?*.*/, /.*coub\.com\/view\/(\w+).*/], embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),
        new oEmbedProvider("discoverychannel", "video", ["snagplayer\\.video\\.dp\\.discovery\\.com/.+"], "http://snagplayer.video.dp.discovery.com/$1/snag-it-player.htm?auto=no", {templateRegex: [/.*snagplayer\.video\.dp\.discovery\/(\w+).*/], embedtag: {tag: 'iframe', width: 480, height: 360 }}),
        new oEmbedProvider("telly", "video", ["telly\\.com/.+"], "http://www.telly.com/embed.php?guid=$1&autoplay=0", {templateRegex: [/.*telly\.com\/embed\.php\?guid=(\w+).*/, /.*telly\.com\/(\w+).*/], embedtag: {tag: 'iframe', width: 480, height: 360 }}),
        new oEmbedProvider("minilogs", "video", ["minilogs\\.com/.+"], "http://www.minilogs.com/e/$1", {templateRegex: [/.*minilogs\.com\/e\/(\w+).*/, /.*minilogs\.com\/(\w+).*/], embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),
        new oEmbedProvider("viddy", "video", ["viddy\\.com/.+"], "http://www.viddy.com/embed/video/$1", {templateRegex: [/.*viddy\.com\/embed\/video\/(\.*)/, /.*viddy\.com\/video\/(\.*)/], embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),
        new oEmbedProvider("worldstarhiphop", "video", ["worldstarhiphop\\.com\/embed/.+"], "http://www.worldstarhiphop.com/embed/$1", {templateRegex: /.*worldstarhiphop\.com\/embed\/(\w+).*/, embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),
        new oEmbedProvider("zapiks", "video", ["zapiks\\.fr\/.+"], "http://www.zapiks.fr/index.php?action=playerIframe&media_id=$1&autoStart=fals", {templateRegex: /.*zapiks\.fr\/index.php\?[\w\=\&]*media_id=(\w+).*/, embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),

        //Audio
        new oEmbedProvider("official.fm", "rich", ["official.fm/.+"], 'http://official.fm/services/oembed', {useYQL: 'json'}),
        new oEmbedProvider("chirbit", "rich", ["chirb.it/.+"], 'http://chirb.it/oembed.json', {useYQL: 'json'}),
        new oEmbedProvider("chirbit", "audio", ["chirb\\.it/.+"], "http://chirb.it/wp/$1", {templateRegex: [/.*chirb\.it\/wp\/(\w+).*/, /.*chirb\.it\/(\w+).*/], embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),
        new oEmbedProvider("Huffduffer", "rich", ["huffduffer.com/[-.\\w@]+/\\d+"], "http://huffduffer.com/oembed"),
        new oEmbedProvider("Spotify", "rich", ["open.spotify.com/(track|album|user)/"], "https://embed.spotify.com/oembed/"),
        new oEmbedProvider("shoudio", "rich", ["shoudio.com/.+", "shoud.io/.+"], "http://shoudio.com/api/oembed"),
        new oEmbedProvider("mixcloud", "rich", ["mixcloud.com/.+"], 'http://www.mixcloud.com/oembed/', {useYQL: 'json'}),
        new oEmbedProvider("rdio.com", "rich", ["rd.io/.+", "rdio.com"], "http://www.rdio.com/api/oembed/"),
        new oEmbedProvider("Soundcloud", "rich", ["soundcloud.com/.+", "snd.sc/.+"], "https://soundcloud.com/oembed", {format: 'js'}),
        new oEmbedProvider("bandcamp", "rich", ["bandcamp\\.com/album/.+"], null,
            {
                yql: {
                    xpath: "https://meta[contains(@content, \\'EmbeddedPlayer\\')]",
                    from: 'html',
                    datareturn: function (results) {
                        return results.meta ? '<iframe width="400" height="100" src="' + results.meta.content + '" allowtransparency="true" frameborder="0"></iframe>' : false;
                    }
                }
            }),

        //Photo
        new oEmbedProvider("deviantart", "photo", ["deviantart.com/.+", "fav.me/.+", "deviantart.com/.+"], "https://backend.deviantart.com/oembed", {format: 'jsonp'}),
        new oEmbedProvider("skitch", "photo", ["skitch.com/.+"], null,
            {
                yql: {
                    xpath: "json",
                    from: 'json',
                    url: function (externalurl) {
                        return 'http://skitch.com/oembed/?format=json&url=' + externalurl
                    },
                    datareturn: function (data) {
                        return $.fn.oembed.getPhotoCode(data.json.url, data.json);
                    }
                }
            }),
        new oEmbedProvider("mobypicture", "photo", ["mobypicture.com/user/.+/view/.+", "moby.to/.+"], "http://api.mobypicture.com/oEmbed"),
        new oEmbedProvider("flickr", "photo", ["flickr\\.com/photos/.+"], "https://flickr.com/services/oembed", {callbackparameter: 'jsoncallback'}),
        new oEmbedProvider("photobucket", "photo", ["photobucket\\.com/(albums|groups)/.+"], "http://photobucket.com/oembed/"),
//        new oEmbedProvider("instagram", "photo", ["instagr\\.?am(\\.com)?/.+"], "https://api.instagram.com/oembed"),
        new oEmbedProvider("instagram", "photo", ["instagr\\.?am(\\.com)?/.+"], null,
            {
                templateRegex: /https?:\/\/w?w?w?.?instagram\.com\/p\/(.*)/,
                template: function (url, param) {
                    param = param.match(/^([^?\/?]+)/)[1];
                    return '<iframe src="https://www.instagram.com/p/'+param+'/embed/?v=4" allowfullscreen="true" allowscriptaccess="always" scrolling="no" frameborder="0"></iframe>'
                },
                nocache: 1
            }),
        //new oEmbedProvider("yfrog", "photo", ["yfrog\\.(com|ru|com\\.tr|it|fr|co\\.il|co\\.uk|com\\.pl|pl|eu|us)/.+"], "http://www.yfrog.com/api/oembed",{useYQL:"json"}),
        new oEmbedProvider("SmugMug", "photo", ["smugmug.com/[-.\\w@]+/.+"], "http://api.smugmug.com/services/oembed/"),
        new oEmbedProvider("dribbble", "photo", ["dribbble.com/shots/.+"], "http://api.dribbble.com/shots/$1?callback=?",
            {
                templateRegex: /.*shots\/([\d]+).*/,
                templateData: function (data) {
                    if (!data.image_teaser_url) {
                        return false;
                    }
                    return  '<img src="' + data.image_teaser_url + '"/>';
                }
            }),
        new oEmbedProvider("chart.ly", "photo", ["chart\\.ly/[a-z0-9]{6,8}"], "http://chart.ly/uploads/large_$1.png",
            {templateRegex: /.*ly\/([^\/]+).*/, embedtag: {tag: 'img'}, nocache: 1}),
        //new oEmbedProvider("stocktwits.com", "photo", ["stocktwits\\.com/message/.+"], "http://charts.stocktwits.com/production/original_$1.png?",
        //  { templateRegex: /.*message\/([^\/]+).*/, embedtag: { tag: 'img'},nocache:1 }),
        new oEmbedProvider("circuitlab", "photo", ["circuitlab.com/circuit/.+"], "https://www.circuitlab.com/circuit/$1/screenshot/540x405/",
            {templateRegex: /.*circuit\/([^\/]+).*/, embedtag: {tag: 'img'}, nocache: 1}),
        new oEmbedProvider("23hq", "photo", ["23hq.com/[-.\\w@]+/photo/.+"], "http://www.23hq.com/23/oembed", {useYQL: "json"}),
        new oEmbedProvider("img.ly", "photo", ["img\\.ly/.+"], "https://img.ly/show/thumb/$1",
            {templateRegex: /.*ly\/([^\/]+).*/, embedtag: {tag: 'img'}, nocache: 1}),
        new oEmbedProvider("twitgoo.com", "photo", ["twitgoo\\.com/.+"], "http://twitgoo.com/show/thumb/$1",
            {templateRegex: /.*com\/([^\/]+).*/, embedtag: {tag: 'img'}, nocache: 1}),
        new oEmbedProvider("imgur.com", "photo", ["imgur\\.com/gallery/.+"], "http://imgur.com/$1l.jpg",
            {templateRegex: /.*gallery\/([^\/]+).*/, embedtag: {tag: 'img'}, nocache: 1}),
        new oEmbedProvider("visual.ly", "rich", ["visual\\.ly/.+"], null,
            {
                yql: {
                    xpath: "https://a[@id=\\'gc_article_graphic_image\\']/img",
                    from: 'htmlstring'
                }
            }),
        new oEmbedProvider("gravtar", "photo", ["mailto:.+"], null,
            {
                templateRegex: /mailto:([^\/]+).*/,
                template: function (wm, email) {
                    return '<img src="http://gravatar.com/avatar/' + email.md5() + '.jpg" alt="on Gravtar" class="jqoaImg">';
                }
            }),
        new oEmbedProvider("achewood", "photo", ["achewood\\.com\\/index.php\\?date=.+"], "http://www.achewood.com/comic.php?date=$1", {templateRegex: /.*achewood\.com\/index.php\?date=(\w+).*/, embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),
        new oEmbedProvider("fotokritik", "photo", ["fotokritik\\.com/.+"], "http://www.fotokritik.com/embed/$1", {templateRegex: [/.*fotokritik\.com\/embed\/(\w+).*/, /.*fotokritik\.com\/(\w+).*/], embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),
        new oEmbedProvider("giflike", "photo", ["giflike\\.com/.+"], "http://www.giflike.com/embed/$1", {templateRegex: [/.*giflike\.com\/embed\/(\w+).*/, /.*giflike\.com\/a\/(\w+).*/], embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),

        //Rich
        new oEmbedProvider("twitter", "rich", ["twitter.com/.+"], "https://api.twitter.com/1/statuses/oembed.json"),
        new oEmbedProvider("gmep", "rich", ["gmep.imeducate.com/.*", "gmep.org/.*"], "http://gmep.org/oembed.json"),
        new oEmbedProvider("urtak", "rich", ["urtak.com/(u|clr)/.+"], "http://oembed.urtak.com/1/oembed"),
        new oEmbedProvider("cacoo", "rich", ["cacoo.com/.+"], "http://cacoo.com/oembed.json"),
        new oEmbedProvider("dailymile", "rich", ["dailymile.com/people/.*/entries/.*"], "http://api.dailymile.com/oembed"),
        new oEmbedProvider("dipity", "rich", ["dipity.com/timeline/.+"], 'http://www.dipity.com/oembed/timeline/', {useYQL: 'json'}),
        new oEmbedProvider("sketchfab", "rich", ["sketchfab.com/show/.+"], 'http://sketchfab.com/oembed', {useYQL: 'json'}),
        new oEmbedProvider("speakerdeck", "rich", ["speakerdeck.com/.+"], 'http://speakerdeck.com/oembed.json', {useYQL: 'json'}),
        new oEmbedProvider("popplet", "rich", ["popplet.com/app/.*"], "http://popplet.com/app/Popplet_Alpha.swf?page_id=$1&em=1",
            {
                templateRegex: /.*#\/([^\/]+).*/,
                embedtag: {
                    width: 460,
                    height: 460
                }
            }),

        new oEmbedProvider("pearltrees", "rich", ["pearltrees.com/.*"], "http://cdn.pearltrees.com/s/embed/getApp?",
            {
                templateRegex: /.*N-f=1_(\d+).*N-p=(\d+).*/,
                embedtag: {
                    width: 460,
                    height: 460,
                    flashvars: "lang=en_US&amp;embedId=pt-embed-$1-693&amp;treeId=$1&amp;pearlId=$2&amp;treeTitle=Diagrams%2FVisualization&amp;site=www.pearltrees.com%2FF"
                }
            }),

        new oEmbedProvider("prezi", "rich", ["prezi.com/.*"], "https://prezi.com/bin/preziloader.swf?",
            {
                templateRegex: /.*com\/([^\/]+)\/.*/,
                embedtag: {
                    width: 550,
                    height: 400,
                    flashvars: "prezi_id=$1&amp;lock_to_path=0&amp;color=ffffff&amp;autoplay=no&amp;autohide_ctrls=0"
                }
            }),

        new oEmbedProvider("tourwrist", "rich", ["tourwrist.com/tours/.+"], null,
            {
                templateRegex: /.*tours.([\d]+).*/,
                template: function (wm, tourid) {
                    setTimeout(function () {
                        if (loadEmbeds)loadEmbeds();
                    }, 2000);
                    return "<div id='" + tourid + "' class='tourwrist-tour-embed direct'></div> <script type='text/javascript' src='http://tourwrist.com/tour_embed.js'></script>";
                }
            }),

        new oEmbedProvider("meetup", "rich", ["meetup\\.(com|ps)/.+"], "http://api.meetup.com/oembed"),
        new oEmbedProvider("ebay", "rich", ["ebay\\.*"], "http://togo.ebay.com/togo/togo.swf?2008013100",
            {
                templateRegex: /.*\/([^\/]+)\/(\d{10,13}).*/,
                embedtag: {
                    width: 355,
                    height: 300,
                    flashvars: "base=http://togo.ebay.com/togo/&lang=en-us&mode=normal&itemid=$2&query=$1"
                }
            }),
        new oEmbedProvider("wikipedia", "rich", ["wikipedia.org/wiki/.+"], "http://$1.wikipedia.org/w/api.php?action=parse&page=$2&format=json&section=0&callback=?", {
            templateRegex: /.*\/\/([\w]+).*\/wiki\/([^\/]+).*/,
            templateData: function (data) {
                if (!data.parse)
                    return false;
                var text = data.parse['text']['*'].replace(/href="\/wiki/g, 'href="http://en.wikipedia.org/wiki');
                return  '<div id="content"><h3><a class="nav-link" href="http://en.wikipedia.org/wiki/' + data.parse['displaytitle'] + '">' + data.parse['displaytitle'] + '</a></h3>' + text + '</div>';
            }
        }),
        new oEmbedProvider("imdb", "rich", ["imdb.com/title/.+"], "http://www.imdbapi.com/?i=$1&callback=?",
            {
                templateRegex: /.*\/title\/([^\/]+).*/,
                templateData: function (data) {
                    if (!data.Title)
                        return false;
                    return  '<div id="content"><h3><a class="nav-link" href="http://imdb.com/title/' + data.imdbID + '/">' + data.Title + '</a> (' + data.Year + ')</h3><p>Rating: ' + data.imdbRating + '<br/>Genre: ' + data.Genre + '<br/>Starring: ' + data.Actors + '</p></div>  <div id="view-photo-caption">' + data.Plot + '</div></div>';
                }
            }),
        new oEmbedProvider("livejournal", "rich", ["livejournal.com/"], "http://ljpic.seacrow.com/json/$2$4?jsonp=?"
            , {
                templateRegex: /(http:\/\/(((?!users).)+)\.livejournal\.com|.*users\.livejournal\.com\/([^\/]+)).*/,
                templateData: function (data) {
                    if (!data.username)
                        return false;
                    return  '<div><img src="' + data.image + '" align="left" style="margin-right: 1em;" /><span class="oembedall-ljuser"><a href="http://' + data.username + '.livejournal.com/profile"><img src="http://www.livejournal.com/img/userinfo.gif" alt="[info]" width="17" height="17" /></a><a href="http://' + data.username + '.livejournal.com/">' + data.username + '</a></span><br />' + data.name + '</div>';
                }
            }),
        new oEmbedProvider("circuitbee", "rich", ["circuitbee\\.com/circuit/view/.+"], "http://c.circuitbee.com/build/r/schematic-embed.html?id=$1",
            {
                templateRegex: /.*circuit\/view\/(\d+).*/,
                embedtag: {
                    tag: 'iframe',
                    width: '500',
                    height: '350'
                }
            }),

        new oEmbedProvider("googlecalendar", "rich", ["www.google.com/calendar/embed?.+"], "$1",
            {templateRegex: /(.*)/, embedtag: {tag: 'iframe', width: '800', height: '600' }}),
        new oEmbedProvider("jsfiddle", "rich", ["jsfiddle.net/[^/]+/?"], "http://jsfiddle.net/$1/embedded/result,js,resources,html,css/?",
            {templateRegex: /.*net\/([^\/]+).*/, embedtag: {tag: 'iframe', width: '100%', height: '300' }}),
        new oEmbedProvider("jsbin", "rich", ["jsbin.com/.+"], "http://jsbin.com/$1/?",
            {templateRegex: /.*com\/([^\/]+).*/, embedtag: {tag: 'iframe', width: '100%', height: '300' }}),
        new oEmbedProvider("jotform", "rich", ["form.jotform.co/form/.+"], "$1?",
            {templateRegex: /(.*)/, embedtag: {tag: 'iframe', width: '100%', height: '507' }}),
        new oEmbedProvider("reelapp", "rich", ["reelapp\\.com/.+"], "http://www.reelapp.com/$1/embed",
            {templateRegex: /.*com\/(\S{6}).*/, embedtag: {tag: 'iframe', width: '400', height: '338'}}),
        new oEmbedProvider("linkedin", "rich", ["linkedin.com/pub/.+"], "https://www.linkedin.com/cws/member/public_profile?public_profile_url=$1&format=inline&isFramed=true",
            {templateRegex: /(.*)/, embedtag: {tag: 'iframe', width: '368px', height: 'auto'}}),
        new oEmbedProvider("timetoast", "rich", ["timetoast.com/timelines/[0-9]+"], "http://www.timetoast.com/flash/TimelineViewer.swf?passedTimelines=$1",
            {templateRegex: /.*timelines\/([0-9]*)/, embedtag: { width: 550, height: 400}, nocache: 1}),
        new oEmbedProvider("pastebin", "rich", ["pastebin\\.com/[\\S]{8}"], "http://pastebin.com/embed_iframe.php?i=$1",
            {templateRegex: /.*\/(\S{8}).*/, embedtag: {tag: 'iframe', width: '100%', height: 'auto'}}),
        new oEmbedProvider("mixlr", "rich", ["mixlr.com/.+"], "http://mixlr.com/embed/$1?autoplay=ae",
            {templateRegex: /.*com\/([^\/]+).*/, embedtag: {tag: 'iframe', width: '100%', height: 'auto' }}),
        new oEmbedProvider("pastie", "rich", ["pastie\\.org/pastes/.+"], null, {yql: {xpath: '//pre[@class="textmate-source"]'}}),
        new oEmbedProvider("github", "rich", ["gist.github.com/.+"], "https://github.com/api/oembed"),
        new oEmbedProvider("github", "rich", ["github.com/[-.\\w@]+/[-.\\w@]+"], "https://api.github.com/repos/$1/$2?callback=?"
            , {templateRegex: /.*\/([^\/]+)\/([^\/]+).*/,
                templateData: function (data) {
                    if (!data.data.html_url)return false;
                    return  '<div class="oembedall-githubrepos"><ul class="oembedall-repo-stats"><li>' + data.data.language + '</li><li class="oembedall-watchers"><a title="Watchers" href="' + data.data.html_url + '/watchers">&#x25c9; ' + data.data.watchers + '</a></li>'
                        + '<li class="oembedall-forks"><a title="Forks" href="' + data.data.html_url + '/network">&#x0265; ' + data.data.forks + '</a></li></ul><h3><a href="' + data.data.html_url + '">' + data.data.name + '</a></h3><div class="oembedall-body"><p class="oembedall-description">' + data.data.description + '</p>'
                        + '<p class="oembedall-updated-at">Last updated: ' + data.data.pushed_at + '</p></div></div>';
                }
            }),
        new oEmbedProvider("facebook", "rich", ["facebook.com"], null
            , {templateRegex: /.*\/([^\/]+)\/([^\/]+).*/,
                template: function (url) {
                    // adding script directly to DOM to make sure that it is loaded correctly.
                    if (!facebookScriptHasBeenAdded) {
                        document.body.appendChild(angular.element('<div id="fb-root"></div>')[0]);
                        var script = document.createElement('script');
                        script.type = 'text/javascript';
                        script.text = '(function(d, s, id) {var js, fjs = d.getElementsByTagName(s)[0];if (d.getElementById(id)) return;js = d.createElement(s); js.id = id;js.src = "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v2.0";fjs.parentNode.insertBefore(js, fjs);}(document, "script", "facebook-jssdk"));';
                        document.body.appendChild(script);
                        facebookScriptHasBeenAdded = true;
                    } else {
                      setTimeout(function() {
                        // facebook script has been added, so window.FB should exist, but defensive
                        if (window.FB && window.FB.XFBML && typeof window.FB.XFBML.parse === 'function') {
                          window.FB.XFBML.parse();
                        }
                      }, 0);
                    }

                    // returning template with url of facebook post.
                    return '<div class="fb-post" data-href="' + url + '" data-width="520"><div class="fb-xfbml-parse-ignore"><a href="' + url + '"></div></div>';

                }
            }),
        new oEmbedProvider("stackoverflow", "rich", ["stackoverflow.com/questions/[\\d]+"], "http://api.stackoverflow.com/1.1/questions/$1?body=true&jsonp=?"
            , {templateRegex: /.*questions\/([\d]+).*/,
                templateData: function (data) {
                    if (!data.questions)
                        return false;
                    var q = data.questions[0];
                    var body = $(q.body).text();
                    var out = '<div class="oembedall-stoqembed"><div class="oembedall-statscontainer"><div class="oembedall-statsarrow"></div><div class="oembedall-stats"><div class="oembedall-vote"><div class="oembedall-votes">'
                        + '<span class="oembedall-vote-count-post"><strong>' + (q.up_vote_count - q.down_vote_count) + '</strong></span><div class="oembedall-viewcount">vote(s)</div></div>'
                        + '</div><div class="oembedall-status"><strong>' + q.answer_count + '</strong>answer</div></div><div class="oembedall-views">' + q.view_count + ' view(s)</div></div>'
                        + '<div class="oembedall-summary"><h3><a class="oembedall-question-hyperlink" href="http://stackoverflow.com/questions/' + q.question_id + '/">' + q.title + '</a></h3>'
                        + '<div class="oembedall-excerpt">' + body.substring(0, 100) + '...</div><div class="oembedall-tags">';
                    for (var i in q.tags) {
                        out += '<a title="" class="oembedall-post-tag" href="http://stackoverflow.com/questions/tagged/' + q.tags[i] + '">' + q.tags[i] + '</a>';
                    }

                    out += '</div><div class="oembedall-fr"><div class="oembedall-user-info"><div class="oembedall-user-gravatar32"><a href="http://stackoverflow.com/users/' + q.owner.user_id + '/' + q.owner.display_name + '">'
                        + '<img width="32" height="32" alt="" src="http://www.gravatar.com/avatar/' + q.owner.email_hash + '?s=32&amp;d=identicon&amp;r=PG"></a></div><div class="oembedall-user-details">'
                        + '<a href="http://stackoverflow.com/users/' + q.owner.user_id + '/' + q.owner.display_name + '">' + q.owner.display_name + '</a><br><span title="reputation score" class="oembedall-reputation-score">'
                        + q.owner.reputation + '</span></div></div></div></div></div>';
                    return out;
                }
            }),
        new oEmbedProvider("wordpress", "rich", ["wordpress\\.com/.+", "blogs\\.cnn\\.com/.+", "techcrunch\\.com/.+", "wp\\.me/.+"], "http://public-api.wordpress.com/oembed/1.0/?for=jquery-oembed-all"),
        new oEmbedProvider("screenr", "rich", ["screenr\.com"], "http://www.screenr.com/embed/$1",
            {templateRegex: /.*\/([^\/]+).*/, embedtag: {tag: 'iframe', width: '650', height: 396}}) ,
        new oEmbedProvider("gigpans", "rich", ["gigapan\\.org/[-.\\w@]+/\\d+"], "http://gigapan.org/gigapans/$1/options/nosnapshots/iframe/flash.html",
            {templateRegex: /.*\/(\d+)\/?.*/, embedtag: {tag: 'iframe', width: '100%', height: 400 }}),
        new oEmbedProvider("scribd", "rich", ["scribd\\.com/.+"], "http://www.scribd.com/embeds/$1/content?start_page=1&view_mode=list",
            {templateRegex: /.*doc\/([^\/]+).*/, embedtag: {tag: 'iframe', width: '100%', height: 600}}),
        new oEmbedProvider("kickstarter", "rich", ["kickstarter\\.com/projects/.+"], "$1/widget/card.html",
            {templateRegex: /([^\?]+).*/, embedtag: {tag: 'iframe', width: '220', height: 380}}),
        new oEmbedProvider("amazon", "rich", ["amzn.com/B+", "amazon.com.*/(B\\S+)($|\\/.*)"], "http://rcm.amazon.com/e/cm?t=_APIKEY_&o=1&p=8&l=as1&asins=$1&ref=qf_br_asin_til&fc1=000000&IS2=1&lt1=_blank&m=amazon&lc1=0000FF&bc1=000000&bg1=FFFFFF&f=ifr",
            {
                apikey: true,
                templateRegex: /.*\/(B[0-9A-Z]+)($|\/.*)/,
                embedtag: {
                    tag: 'iframe',
                    width: '120px',
                    height: '240px'}
            }),
        new oEmbedProvider("slideshare", "rich", ["slideshare\.net"], "https://www.slideshare.net/api/oembed/2", {format: 'jsonp'}),
        new oEmbedProvider("roomsharejp", "rich", ["roomshare\\.jp/(en/)?post/.*"], "http://roomshare.jp/oembed.json"),
        new oEmbedProvider("lanyard", "rich", ["lanyrd.com/\\d+/.+"], null,
            {
                yql: {
                    xpath: '(//div[@class="primary"])[1]',
                    from: 'htmlstring',
                    datareturn: function (results) {
                        if (!results.result)
                            return false;
                        return '<div class="oembedall-lanyard">' + results.result + '</div>';
                    }
                }
            }),
        new oEmbedProvider("asciiartfarts", "rich", ["asciiartfarts.com/\\d+.html"], null,
            {
                yql: {
                    xpath: '//pre/font',
                    from: 'htmlstring',
                    datareturn: function (results) {
                        if (!results.result)
                            return false;
                        return '<pre style="background-color:#000;">' + results.result + '</div>';
                    }
                }
            }),
        new oEmbedProvider("coveritlive", "rich", ["coveritlive.com/"], null, {
            templateRegex: /(.*)/,
            template: '<iframe src="$1" allowtransparency="true" scrolling="no" width="615px" frameborder="0" height="625px"></iframe>'}),
        new oEmbedProvider("polldaddy", "rich", ["polldaddy.com/"], null, {
            templateRegex: /(?:https?:\/\/w?w?w?.?polldaddy.com\/poll\/)([0-9]*)\//,
            template: '<script async type="text/javascript" charset="utf-8" src="http://static.polldaddy.com/p/$1.js"></script>',
            nocache: 1
        }),
        new oEmbedProvider("360io", "rich", ["360\\.io/.+"], "http://360.io/$1", {templateRegex: /.*360\.io\/(\w+).*/, embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),
        new oEmbedProvider("bubbli", "rich", ["on\\.bubb\\.li/.+"], "http://on.bubb.li/$1", {templateRegex: /.*on\.bubb\.li\/(\w+).*/, embedtag: {tag: 'iframe', width: 480, height: 360}, nocache: 1 }),
        new oEmbedProvider("cloudup", "rich", ["cloudup\\.com/.+"], "http://cloudup.com/$1?chromeless", {templateRegex: [/.*cloudup\.com\/(\w+).*/], embedtag: {tag: 'iframe', width: 480, height: 360 }}),
        new oEmbedProvider("codepen", "rich", ["codepen.io/.+"], "http://codepen.io/$1/embed/$2", {templateRegex: [/.*io\/(\w+)\/pen\/(\w+).*/, /.*io\/(\w+)\/full\/(\w+).*/], embedtag: {tag: 'iframe', width: '100%', height: '300'}, nocache: 1 }),
        new oEmbedProvider("googleviews", "rich", ["(.*maps\\.google\\.com\\/maps\\?).+(output=svembed).+(cbp=(.*)).*"], "https://maps.google.com/maps?layer=c&panoid=$3&ie=UTF8&source=embed&output=svembed&cbp=$5", {templateRegex: /(.*maps\.google\.com\/maps\?).+(panoid=(\w+)&).*(cbp=(.*)).*/, embedtag: {tag: 'iframe', width: 480, height: 360}, nocache: 1 }),
        new oEmbedProvider("googlemaps", "rich", ["google\\.com\/maps\/place/.+"], "http://maps.google.com/maps?t=m&q=$1&output=embed", {templateRegex: /.*google\.com\/maps\/place\/([\w\+]*)\/.*/, embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),
        new oEmbedProvider("imajize", "rich", ["embed\\.imajize\\.com/.+"], "http://embed.imajize.com/$1", {templateRegex: /.*embed\.imajize\.com\/(.*)/, embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),
        new oEmbedProvider("mapjam", "rich", ["mapjam\\.com/.+"], "http://www.mapjam.com/$1", {templateRegex: /.*mapjam\.com\/(.*)/, embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),
        new oEmbedProvider("polar", "rich", ["polarb\\.com/.+"], "http://assets-polarb-com.a.ssl.fastly.net/api/v4/publishers/unknown/embedded_polls/iframe?poll_id=$1", {templateRegex: /.*polarb\.com\/polls\/(\w+).*/, embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),
        new oEmbedProvider("ponga", "rich", ["ponga\\.com/.+"], "https://www.ponga.com/embedded?id=$1", {templateRegex: [/.*ponga\.com\/embedded\?id=(\w+).*/, /.*ponga\.com\/(\w+).*/], embedtag: {tag: 'iframe', width: 480, height: 360 }, nocache: 1}),


        new oEmbedProvider("touchcast", "photo", ["touchcast\.com/.+"], null,
        {
            templateRegex: /(.*)/,
            template: '<iframe src="$1" allowfullscreen="true" allowscriptaccess="always" scrolling="no" frameborder="0"></iframe>',
            nocache: 1
        }),


        //Use Open Graph Where applicable
        new oEmbedProvider("audioboom", "rich", ["audioboom\.com\/.+"], null,
        {
            templateRegex: /(.*)/,
            template: '<div class="ab-player" data-boourl="$1/embed/v2" data-iframestyle="background-color:transparent;"></div><script type="text/javascript">(function() { var po = document.createElement("script"); po.type = "text/javascript"; po.async = true; po.src = "https://d15mj6e6qmt1na.cloudfront.net/cdn/embed.js"; var s = document.getElementsByTagName("script")[0]; s.parentNode.insertBefore(po, s); })();</script>',
            nocache: 1
        }),

        //Use Open Graph Where applicable
        new oEmbedProvider("opengraph", "rich", [".*"], null,
            {
                yql: {
                    xpath: "https://meta|//title|//link",
                    from: 'html',
                    datareturn: function (results) {
                        if (!results['og:title'] && results['title'] && results['description'])
                            results['og:title'] = results['title'];

                        if (!results['og:title'] && !results['title'])
                            return false;

                        var code = angular.element('<p/>');
                        if (results['og:video']) {
                            var embed = angular.element('<embed src="' + results['og:video'] + '"/>');
                            embed.attr('type', results['og:video:type'] || "application/x-shockwave-flash")
                                .css('max-height', settings.maxHeight || 'auto')
                                .css('max-width', settings.maxWidth || 'auto');

                            if (results['og:video:width'])
                                embed.attr('width', results['og:video:width']);
                            if (results['og:video:height'])
                                embed.attr('height', results['og:video:height']);
                            code.append(embed);
                        } else if (results['og:image']) {
                            var img = angular.element('<img src="' + results['og:image'] + '">');
                            img.css('max-height', settings.maxHeight || 'auto').css('max-width', settings.maxWidth || 'auto');
                            if (results['og:image:width'])
                                img.attr('width', results['og:image:width']);
                            if (results['og:image:height'])
                                img.attr('height', results['og:image:height']);
                            code.append(img);
                        }

                        if (results['og:title'])
                            code.append('<b>' + results['og:title'] + '</b><br/>');

                        if (results['og:description'])
                            code.append(results['og:description'] + '<br/>');
                        else if (results['description'])
                            code.append(results['description'] + '<br/>');

                        return code;
                    }
                }
            }
        )];


    function getOEmbedProvider(url) {
        for (var i = 0; i < providers.length; i++) {
            for (var j = 0, l = providers[i].urlschemes.length; j < l; j++) {
                var regExp = new RegExp(providers[i].urlschemes[j], "i");

                if (url.match(regExp) !== null)
                    return providers[i];
            }
        }
    }


    var getEmbedHTML = function (externalUrl, embedProvider, settings) {
        if (embedProvider.yql) {
            return yqlProviderService.getEmbed(externalUrl, embedProvider, settings);
        }
        if (embedProvider.templateRegex) {
            if (embedProvider.embedtag.tag !== '') {
                return embedTagService.getEmbed(externalUrl, embedProvider, settings);
            }
            else {
                return templateProviderService.getEmbed(externalUrl, embedProvider, settings);
            }
        }
        return apiProviderService.getEmbed(externalUrl, embedProvider, settings);
    };


    return {
        getOEmbedProvider: getOEmbedProvider,
        getEmbedHTML: getEmbedHTML
    }
}


app.service('oEmbedProviderService', ['templateService', 'yqlService', 'apiService', 'embedTagService', 'oEmbedProvider', oEmbedProviderService]);














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
function YQLServiceProvider(BaseService, $q) {
    'use strict';

    function YQLService() {
        BaseService.call(this);
    }
    YQLService.prototype = new BaseService;
    YQLService.prototype.getEmbed = function (externalUrl, embedProvider) {
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
                }}).then(function (data) {
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
            }).catch(function (e) {
                deferred.reject(e);
            });

            return deferred.promise;
        }.bind(this)();
    };

    return new YQLService();
}

app.factory('yqlService', ['baseService', '$q', YQLServiceProvider]);