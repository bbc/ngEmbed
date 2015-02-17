//'http://en.wikipedia.org/wiki/BBC'


describe('EmbedTagService', function () {
    var baseService, embedTagService;

    beforeEach(module('ngEmbed'));
    beforeEach(inject(function (baseServiceProvider, _embedTagService_) {
        baseService = baseServiceProvider;
        embedTagService = _embedTagService_;
    }));

    it('should inherit from base service', function () {
        expect(embedTagService.prototype.constructor).toEqual(baseService);
    });

    it('should have a getEmbed method', function () {
        expect(embedTagService.getEmbed).toBeTruthy();
    });
});