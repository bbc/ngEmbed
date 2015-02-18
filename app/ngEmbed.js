function ngEmbedController($scope, oEmbedProviderService, longifyService) {
    $scope.internalModel = {};
    $scope.embedUrl = '';
    $scope.embedHTML = '';

    $scope.$watch('embedUrl', function (newValue) {
        if (newValue) {
            $scope.internalModel.originalUrl = newValue;
            longifyService.longify(newValue).then(function (longUrl) {
                var provider = oEmbedProviderService.getOEmbedProvider(longUrl);
                provider.params = {};
                oEmbedProviderService.getEmbedHTML(longUrl, provider).then(function (html) {
                    $scope.embedHTML = html;
                    $scope.internalModel.longUrl = longUrl;
                    $scope.internalModel.provider = provider;
                    $scope.internalModel.html = html;
                });
            });
        }
    });

}

function ngEmbed() {
    return {
        scope: {},
        restrict: 'EA',
        require: '?ngModel',
        controller: 'ngEmbedController',
        link: function (scope, element, attr, ngModel) {
            attr.$observe('embedUrl', function (value) {
                scope.embedUrl = value;
            });
            scope.$watch('embedHTML', function (newValue) {
                if (newValue) {
                    element.html(newValue);
                }
            });

            scope.$watch('internalModel', function (newValue) {
                if (newValue && ngModel) {
                    ngModel.$setViewValue(newValue);
                }
            });
        }
    }
}

app.controller('ngEmbedController', ['$scope', 'oEmbedProviderService', 'longifyServiceProvider', ngEmbedController]);
app.directive('ngEmbed', [ngEmbed]);


