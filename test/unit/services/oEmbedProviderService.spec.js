describe('oEmbedProviderService', function () {
    'use strict';

    var embed, baseService, embedTagService, templateService, yqlService, apiService, oEmbedProvider, oEmbedProviderService;

    beforeEach(module('ngEmbed'));
    beforeEach(inject(function (_baseService_, _embedTagService_, _oEmbedProvider_, _oEmbedProviderService_, _templateService_, _yqlService_, _apiService_) {
        baseService = _baseService_;
        oEmbedProvider = _oEmbedProvider_;
        oEmbedProviderService = _oEmbedProviderService_;


        embedTagService = _embedTagService_;
        templateService = _templateService_;
        yqlService = _yqlService_;
        apiService = _apiService_;
    }));


    it('should call the correct subservice', function () {
        /********embed tag*****/
        embed = new oEmbedProvider("youtube", "video", ["youtube\\.com/watch.+v=[\\w-]+&?", "youtu\\.be/[\\w-]+", "youtube.com/embed"], 'http://www.youtube.com/embed/$1?wmode=transparent', {
            templateRegex: /.*(?:v\=|be\/|embed\/)([\w\-]+)&?.*/, embedtag: {tag: 'iframe', width: '425', height: '349'}
        });
        spyOn(embedTagService, 'getEmbed');
        oEmbedProviderService.getEmbedHTML('testurl', embed);
        expect(embedTagService.getEmbed).toHaveBeenCalled();

        /********template********/
        embed = new oEmbedProvider("wikipedia", "rich", ["wikipedia.org/wiki/.+"], "http://$1.wikipedia.org/w/api.php?action=parse&page=$2&format=json&section=0&callback=?", {
            templateRegex: /.*\/\/([\w]+).*\/wiki\/([^\/]+).*/,
            templateData: function (data) {
            }
        });
        spyOn(templateService, 'getEmbed');
        oEmbedProviderService.getEmbedHTML('testurl', embed);
        expect(templateService.getEmbed).toHaveBeenCalled();


        /********yql********/
        embed = new oEmbedProvider("touchcast", "rich", ["touchcast\\.com/.*"], null,
            {
                yql: {}
            }
        );
        spyOn(yqlService, 'getEmbed');
        oEmbedProviderService.getEmbedHTML('testurl', embed);
        expect(yqlService.getEmbed).toHaveBeenCalled();

        /********api********/
        embed = new oEmbedProvider("vimeo", "video", ["www\.vimeo\.com\/groups\/.*\/videos\/.*", "www\.vimeo\.com\/.*", "vimeo\.com\/groups\/.*\/videos\/.*", "vimeo\.com\/.*"], "//vimeo.com/api/oembed.json"),
        spyOn(apiService, 'getEmbed');
        oEmbedProviderService.getEmbedHTML('testurl', embed);
        expect(apiService.getEmbed).toHaveBeenCalled();
    });
});