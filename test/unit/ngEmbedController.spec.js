
describe('ngEmbedController', function() {
    var $scope, element, $controller, createController;

    beforeEach(module('ngEmbed'));
    beforeEach(inject(function($rootScope, _$controller_) {
        $scope = $rootScope.$new();
        $controller = _$controller_;
        createController = function () {
            return $controller('ngEmbedController', {
                '$scope': $scope
            });
        };
    }));



    describe('init', function() {
        it('', function() {
            createController();


        });
    });

});