



function ngEmbedController($scope, oEmbedProviderService, longifyService) {
    $scope.embedUrl = '';
    $scope.embedHTML = '';

    $scope.$watch('embedUrl', function(newValue) {
        if(newValue) {
            longifyService.longify(newValue).then(function(longUrl) {
                var provider = oEmbedProviderService.getOEmbedProvider(longUrl);
                provider.params = {};
                oEmbedProviderService.getEmbedHTML(longUrl, provider).then(function(html) {
                    $scope.embedHTML = html;
                });
            });




        }
    });

}

function ngEmbed() {
    return {
        scope: {},
        restrict: 'EA',
        controller: 'ngEmbedController',
        link: function(scope, element, attr) {
            attr.$observe('embedUrl', function(value) {
                scope.embedUrl = value;
            });
            scope.$watch('embedHTML', function(newValue) {
                if(newValue) {
                    element.html(newValue);
                }
            });
        }
    }
}

app.controller('ngEmbedController', ['$scope', 'oEmbedProviderService', 'longifyService', ngEmbedController])
app.directive('ngEmbed', [ngEmbed]);


