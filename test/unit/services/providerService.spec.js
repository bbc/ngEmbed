describe('BaseProviderService', function() {
    var baseService;
    beforeEach(module('ngEmbed'));
    beforeEach(inject(function(providerService) {
        baseService = providerService;
    }));

   it('should have a getEmbed method', function() {
        expect(baseService.getEmbed).toBeTruthy();
   });
});