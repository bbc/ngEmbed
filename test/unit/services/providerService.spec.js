describe('BaseProviderService', function() {
    var baseService;
    beforeEach(module('ngEmbed'));
    beforeEach(inject(function(_baseService_) {
        baseService = new _baseService_();
    }));

   it('should have a getEmbed method', function() {
        expect(baseService.getEmbed).toBeTruthy();
   });
});