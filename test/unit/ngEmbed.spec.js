

describe('ngEmbed', function() {
    var scope, $rootScope, $httpBackend, element, $compile;

    beforeEach(module('ngEmbed'));
    beforeEach(inject(function(_$rootScope_, _$compile_, _$httpBackend_) {
        $rootScope = _$rootScope_;
        $httpBackend = _$httpBackend_;
        scope = $rootScope.$new();
        $compile = _$compile_;
        element = $compile('<ng-embed></ng-embed>')($rootScope);
        $rootScope.$digest();
    }));



    describe('init', function() {
        it('should respond an embed url', function() {
            expect(element.isolateScope().embedUrl).toEqual('');
//            $httpBackend.expectJSONP('').respond(200, {});
            element = $compile('<ng-embed embed-url="https://www.youtube.com/watch?v=TWfph3iNC-k"></ng-embed>')($rootScope);
            element.isolateScope().$digest();
//            $httpBackend.flush();
            expect(element.isolateScope().embedUrl).toEqual('https://www.youtube.com/watch?v=TWfph3iNC-k');
        });
    });

});