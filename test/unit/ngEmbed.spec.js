

describe('ngEmbed', function() {
    var scope, $rootScope, model, $httpBackend, element, $compile;

    beforeEach(module('ngEmbed'));
    beforeEach(inject(function(_$rootScope_, _$compile_, _$httpBackend_) {
        model = {};
        $rootScope = _$rootScope_;
        $httpBackend = _$httpBackend_;
        scope = $rootScope.$new();
        $compile = _$compile_;
        element = $compile('<ng-embed ng-model="model"></ng-embed>')(scope);
        $rootScope.$digest();
    }));

    describe('init', function() {
        it('should create the right model', function() {
            scope.model = {};
            element = $compile('<ng-embed ng-model="model" embed-url="https://www.youtube.com/watch?v=TWfph3iNC-k"></ng-embed>')(scope);
            element.isolateScope().$digest();
            expect(scope.model.originalUrl).toBeTruthy();
            expect(scope.model.longUrl).toBeTruthy();
            expect(scope.model.provider).toBeTruthy();
            expect(scope.model.html).toBeTruthy();
        });

        it('should assign general settings', function() {
            scope.settings = {
                'randomSetting': 'random'
            };
            element = $compile('<ng-embed embed-url="https://www.youtube.com/watch?v=TWfph3iNC-k" settings="settings"></ng-embed>')(scope);
            element.isolateScope().$digest();
            expect(element.isolateScope().settings.randomSetting).toEqual('random');
        });

        it('should assign provider settings', function() {
            scope.settings = {
                'youtube': {
                    'randomString': 'random'
                }
            };
            element = $compile('<ng-embed embed-url="https://www.youtube.com/watch?v=TWfph3iNC-k" settings="settings"></ng-embed>')(scope);
            element.isolateScope().$digest();
            expect(element.isolateScope().settings.randomSetting).toBeUndefined();
            expect(element.isolateScope().provider.params['randomString']).toBeUndefined()
            expect(element.isolateScope().provider.params['randomstring']).toEqual('random');
        });
    });

});