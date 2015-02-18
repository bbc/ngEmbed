//'http://en.wikipedia.org/wiki/BBC'


describe('EmbedTagService', function () {
    var embed, baseService, embedTagService, oEmbedProvider, oEmbedProviderService;

    beforeEach(module('ngEmbed'));
    beforeEach(inject(function (baseServiceProvider, _embedTagService_, _oEmbedProvider_, _oEmbedProviderService_) {
        baseService = baseServiceProvider;
        embedTagService = _embedTagService_;
        oEmbedProvider = _oEmbedProvider_;
        oEmbedProviderService =_oEmbedProviderService_;
    }));

    it('should inherit from base service', function () {
        expect(embedTagService.prototype.constructor).toEqual(baseService);
    });

    it('should have a getEmbed method', function () {
        expect(embedTagService.getEmbed).toBeTruthy();
    });

    it('should', function() {

    });
});