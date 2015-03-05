function ngEmbedController($scope, oEmbedProviderService, longifyService) {
    'use strict';

    $scope.internalModel = {};
    $scope.embedUrl = '';
    $scope.embedHTML = '';
    $scope.embedSettings = {};

    function getNormalizedParams(params) {
        if (params === null) return null;
        var key, normalizedParams = {};
        for (key in params) {
            if (key !== null) normalizedParams[key.toLowerCase()] = params[key];
        }
        return normalizedParams;
    }

    $scope.$watch('embedUrl', function (newValue) {
        if (newValue) {
            $scope.internalModel.originalUrl = newValue;
            longifyService.longify(newValue).then(function (longUrl) {
                $scope.provider = oEmbedProviderService.getOEmbedProvider(longUrl);

                if ($scope.embedSettings.fallback === false) {
                    $scope.provider = $scope.provider.name.toLowerCase() === 'opengraph' ? null : $scope.provider;
                }

                if($scope.provider) {
                    $scope.provider.params = getNormalizedParams($scope.embedSettings[$scope.provider.name]) || {};

                    if ($scope.embedSettings.onbeforeembed || $scope.provider.params.onbeforeembed) {
                        var callback = $scope.embedSettings.onbeforeembed || $scope.provider.params.onbeforeembed;
                        if (callback.call(this, longUrl, $scope.provider) === false) {
                            return;
                        }
                    }

                    oEmbedProviderService.getEmbedHTML(longUrl, $scope.provider, $scope.embedSettings).then(function (html) {
                        $scope.embedHTML = html;
                        $scope.internalModel.longUrl = longUrl;
                        $scope.internalModel.provider = $scope.provider;
                        $scope.internalModel.html = html;
                    }, function(params) {
                        if($scope.embedSettings.onerror || $scope.provider.params.onerror) {
                            var callback = $scope.embedSettings.onerror || $scope.provider.params.onerror;
                            callback.call(this, params);
                        }
                    });
                }
                else {
                    if ($scope.embedSettings.onnotsupported) {
                        $scope.embedSettings.onnotsupported.call(this, longUrl);
                    }
                }

            });
        }
    });

}

function ngEmbed() {
    'use strict';

    return {
        scope: {
            settings: '='
        },
        restrict: 'EA',
        require: '?ngModel',
        controller: 'ngEmbedController',
        link: function (scope, element, attr, ngModel) {
            attr.$observe('embedUrl', function (value) {
                scope.embedUrl = value;
            });
            scope.$watch('settings', function (value) {
                if (value) {
                    scope.embedSettings = value;
                }
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

app.controller('ngEmbedController', ['$scope', 'oEmbedProviderService', 'longifyService', ngEmbedController]);
app.directive('ngEmbed', [ngEmbed]);


