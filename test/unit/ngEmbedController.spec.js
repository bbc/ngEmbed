
describe('ngEmbedController', function() {
    var $scope, $q, dummyPromise, element, $controller, createController, oEmbedProviderServiceDummy;

    beforeEach(module('ngEmbed'));
    beforeEach(inject(function($rootScope, _$controller_, _$q_) {
        $scope = $rootScope.$new();
        $controller = _$controller_;
        $q = _$q_;
        dummyPromise = $q.defer();
        oEmbedProviderServiceDummy = {
            getEmbedHTML: function() {
                return dummyPromise.promise;
            },
            getOEmbedProvider: function(){
                return {};
            }
        };

        createController = function () {
            return $controller('ngEmbedController', {
                '$scope': $scope,
                'oEmbedProviderService': oEmbedProviderServiceDummy
            });
        };
    }));



//    describe('init', function() {
//        it('should retrieve embed code', function() {
//            var html = '<p></p>';
//            createController();
//            spyOn(oEmbedProviderServiceDummy, 'getEmbedHTML').and.callThrough();
//            $scope.embedUrl = 'test';
//            $scope.$digest();
//            expect(oEmbedProviderServiceDummy.getEmbedHTML).toHaveBeenCalled();
//            dummyPromise.resolve(html);
//            $scope.$digest();
//            expect($scope.embedHTML).toEqual(html);
//        });
//    });

});