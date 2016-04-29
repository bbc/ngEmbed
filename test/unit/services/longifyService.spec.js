describe('EmbedTagService', function () {
    'use strict';

    var $rootScope, baseService, longifyService, $httpBackend;

    beforeEach(module('ngEmbed'));
    beforeEach(inject(function (_$rootScope_, _baseService_, _longifyService_, _$httpBackend_) {
        $rootScope = _$rootScope_;
        baseService = _baseService_;
        longifyService = _longifyService_;
        $httpBackend = _$httpBackend_;
    }));

    it('should inherit from base service', function () {
        expect(longifyService.prototype.constructor).toEqual(baseService);
    });


    it('should attempt to resolve short urls', function(done) {

        var shortUrl = 'https://flic.kr/p/q7E1Qg';
        var settings = {};
        $httpBackend.expectJSONP('http://api.longurl.org/v2/expand?callback=JSON_CALLBACK&format=json&url=https:%2F%2Fflic.kr%2Fp%2Fq7E1Qg').respond(200, {
            'long-url': 'this is a long url'
        });
        longifyService.longify(shortUrl, settings).then(function(data) {
            expect(data).toEqual('this is a long url');
            done();
        });

        $httpBackend.flush();
    });
});
