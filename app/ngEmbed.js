



function ngEmbedController($scope, oEmbedProviderService) {
    $scope.embedUrl = '';
    $scope.embedHTML = '';

    $scope.$watch('embedUrl', function(newValue) {
        if(newValue) {
            var provider = oEmbedProviderService.getOEmbedProvider(newValue);
            oEmbedProviderService.getEmbedHTML(newValue, provider).then(function(html) {
                $scope.embedHTML = html;
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
                    console.log(newValue);
                    element.html(newValue);
                }
            });
        }
    }
}

app.controller('ngEmbedController', ['$scope', 'oEmbedProviderService', ngEmbedController])
app.directive('ngEmbed', [ngEmbed]);


