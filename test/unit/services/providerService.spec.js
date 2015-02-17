describe('BaseProviderService', function() {
    var baseService;
    beforeEach(module('ngEmbed'));
    beforeEach(inject(function(baseServiceProvider) {
        baseService = new baseServiceProvider();
    }));

   it('should have a getEmbed method', function() {
        expect(baseService.getEmbed).toBeTruthy();
   });
});