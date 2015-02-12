

describe('ngEmbed', function() {
    var scope, $rootScope, element, $compile;

    beforeEach(module('ngEmbed'));
    beforeEach(inject(function(_$rootScope_, _$compile_) {
        $rootScope = _$rootScope_;
        scope = $rootScope.$new();
        $compile = _$compile_;
        element = $compile('<ng-embed></ng-embed>')($rootScope);
        $rootScope.$digest();
    }));



    describe('init', function() {
        it('should respond an embed url', function() {
            expect(element.isolateScope().embedUrl).toEqual('');
            element = $compile('<ng-embed embed-url="https://www.youtube.com/watch?v=TWfph3iNC-k"></ng-embed>')($rootScope);
            element.isolateScope().$digest();
            expect(element.isolateScope().embedUrl).toEqual('https://www.youtube.com/watch?v=TWfph3iNC-k');
        });
    });

});